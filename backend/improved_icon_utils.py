# improved_icon_utils.py
from io import BytesIO
from threading import Thread
from cloud_storage_config import storage

def pluralize_icon_type(icon_type: str) -> str:
    return "allergies" if icon_type == "allergy" else f"{icon_type}s"

def generate_and_upload_icon(app, name, category, icon_type='ingredient'):
    """
    Generate icon and upload to cloud storage
    Returns: success boolean
    """
    key = build_storage_key(name, category, icon_type)
    
    # Check if already exists
    if storage.exists(key):
        return True

    with app.app_context():
        try:
            from ingredient_icon_generator.main import get_ingredient_icon

            icon = get_ingredient_icon(name, category, size=256)

            buffer = BytesIO()
            icon.save(buffer, format='PNG')
            buffer.seek(0)

            success = storage.upload_image(buffer, key, content_type='image/png')

            if not success:
                print(f"[ERROR] Failed to upload icon: {key}", flush=True)

            return success

        except Exception as e:
            print(f"[ERROR] Failed to generate icon for {name}: {e}", flush=True)
            return False


def build_storage_key(name, category, icon_type='ingredient'):
    """Build consistent storage key"""
    base_path = f"{pluralize_icon_type(icon_type)}/generated_images"

    if category:
        filename = f"{name}_{category}.png"
    else:
        filename = f"{name}.png"
    return f"{base_path}/{filename}"


def async_generate_icon(app, name, category, icon_type='ingredient'):
    """
    Asynchronously generate and upload icon
    This is safe for production as it doesn't rely on shared locks
    """
    Thread(
        target=generate_and_upload_icon,
        args=(app, name, category, icon_type),
        daemon=True  # Allow process to exit even if thread is running
    ).start()


def cleanup_icon_if_unused(name, category, icon_type, model_class, check_column='name'):
    """
    Delete icon if no longer used by any user
    
    Args:
        name: ingredient/allergy name
        category: category (optional)
        icon_type: 'ingredient' or 'allergy'
        model_class: Ingredient or Allergy model
        check_column: column name to check ('name' or 'allergy_name')
    """
    # Normalize empty string to empty string (consistent with your app logic)
    if not category:
        category = ''
    
    # Check if still in use
    filter_kwargs = {check_column: name}
    if icon_type == 'ingredient':
        filter_kwargs['category'] = category
    else:
        filter_kwargs['allergy_category'] = category
    
    count = model_class.query.filter_by(**filter_kwargs).count()
    
    if count == 0:
        key = build_storage_key(name, category, icon_type)
        success = storage.delete(key)
        
        if success:
            print(f"[CLEANUP] Deleted unused icon: {key}", flush=True)
        else:
            print(f"[WARNING] Could not delete icon: {key}", flush=True)