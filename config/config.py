import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Configuracion de la aplicacion."""

    SECRET_KEY = os.getenv('SECRET_KEY', 'clave-por-defecto')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///fallback.db').replace('postgres://', 'postgresql+psycopg://')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-clave-por-defecto')
    JWT_ACCESS_TOKEN_EXPIRES = 86400

    SENDGRID_API_KEY = os.getenv('SENDGRID_API_KEY')
    SENDGRID_FROM_EMAIL = os.getenv('SENDGRID_FROM_EMAIL')
    EXCHANGERATE_API_KEY = os.getenv('EXCHANGERATE_API_KEY')
    OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY')
    FACTURAPI_API_KEY = os.getenv('FACTURAPI_API_KEY')
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')