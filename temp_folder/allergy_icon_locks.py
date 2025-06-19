from threading import Lock
from collections import defaultdict

# one Lock per allergy name
ALLERGY_ICON_LOCKS = defaultdict(Lock)