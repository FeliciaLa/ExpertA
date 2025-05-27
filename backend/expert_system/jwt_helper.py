"""
JWT Helper module to ensure JWT packages are installed and available.
This file is imported by settings.py during Django initialization.
"""
import sys
import subprocess
import importlib
from pathlib import Path

def ensure_jwt_available():
    """Ensure JWT packages are installed and available."""
    print("Checking JWT packages availability...")
    
    packages_to_check = [
        ('rest_framework_simplejwt', 'djangorestframework-simplejwt==5.3.1'),
        ('jwt', 'PyJWT==2.8.0')
    ]
    
    for module_name, package_name in packages_to_check:
        try:
            # Try importing the module
            importlib.import_module(module_name)
            print(f"✓ Successfully imported {module_name}")
        except ImportError as e:
            print(f"✗ Error importing {module_name}: {e}")
            try:
                # Install the package
                print(f"Installing {package_name}...")
                subprocess.check_call([sys.executable, "-m", "pip", "install", package_name])
                
                # Try importing again after installation
                importlib.import_module(module_name)
                print(f"✓ Successfully installed and imported {module_name}")
            except Exception as e:
                print(f"✗ Failed to install {module_name}: {e}")
                print(f"  This may cause issues with authentication.")
    
    # Return True to indicate function executed (even if some packages failed)
    return True 