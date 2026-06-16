import firebase_admin
from firebase_admin import credentials, auth

def initialize_firebase():
    try:
        cred = credentials.Certificate('path/to/serviceAccountKey.json')
        firebase_admin.initialize_app(cred)
        print("Firebase initialized successfully")
    except Exception as e:
        print(f"Error initializing Firebase: {e}")

if __name__ == '__main__':
    initialize_firebase()
