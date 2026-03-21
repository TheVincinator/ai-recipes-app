import anthropic
import os
from io import BytesIO
from cloud_storage_config import storage


def build_storage_key(name, category, icon_type='ingredient'):
    asset_type = 'allergies' if icon_type == 'allergy' else f'{icon_type}s'
    filename = f"{name}_{category}.svg" if category else f"{name}.svg"
    return f"{asset_type}/generated_images/{filename}"


def generate_icon(name, category, icon_type='ingredient'):
    """Generate SVG icon using Claude and upload to storage. Synchronous."""
    key = build_storage_key(name, category, icon_type)

    if storage.exists(key):
        return True

    try:
        client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
        item_type = 'food allergen' if icon_type == 'allergy' else 'food ingredient'
        query = f"{name} {category}".strip() if category else name

        response = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=1024,
            messages=[{
                "role": "user",
                "content": (
                    f'Generate a minimal SVG icon for "{query}" ({item_type}). '
                    'Requirements: viewBox="0 0 100 100", simple recognizable shapes, '
                    'use a relevant food color, no text, no gradients. '
                    'Return ONLY the raw SVG code, no markdown fences or explanation.'
                )
            }]
        )

        svg_text = response.content[0].text.strip()
        if '<svg' in svg_text:
            start = svg_text.index('<svg')
            end = svg_text.rindex('</svg>') + 6
            svg_text = svg_text[start:end]

        buffer = BytesIO(svg_text.encode('utf-8'))
        return storage.upload_image(buffer, key, content_type='image/svg+xml')

    except Exception:
        return False



def cleanup_icon_if_unused(name, category, icon_type, model_class, check_column='name'):
    """Delete SVG icon from storage if no longer used by any user."""
    if not category:
        category = ''

    filter_kwargs = {check_column: name}
    if icon_type == 'ingredient':
        filter_kwargs['category'] = category
    else:
        filter_kwargs['allergy_category'] = category

    count = model_class.query.filter_by(**filter_kwargs).count()

    if count == 0:
        key = build_storage_key(name, category, icon_type)
        storage.delete(key)
