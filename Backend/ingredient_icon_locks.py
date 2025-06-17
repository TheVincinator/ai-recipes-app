from threading import Lock
from collections import defaultdict

# one Lock per ingredient name
INGREDIENT_ICON_LOCKS = defaultdict(Lock)