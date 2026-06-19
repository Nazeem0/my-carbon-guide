from fastapi import Header, HTTPException, status
from firebase_admin import auth as fb_auth


async def verify_token(authorization: str = Header(...)) -> dict:
    """
    Extracts the Firebase ID token from the `Authorization: Bearer <token>` header,
    verifies it with Firebase Admin SDK, and returns the decoded token payload
    which includes the user's `uid`, `email`, etc.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Expected: Bearer <token>",
        )

    id_token = authorization.split(" ", 1)[1]

    try:
        decoded = fb_auth.verify_id_token(id_token)
        return decoded
    except fb_auth.ExpiredIdTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired.")
    except fb_auth.InvalidIdTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid ID token.")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
