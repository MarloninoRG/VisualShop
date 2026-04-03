import os
from dotenv import load_dotenv

# Carga las variables del archivo .env al entorno
load_dotenv()


class Config:
    """Configuracion base de la aplicacion.
    Todas las variables sensibles se leen del archivo .env
    para no exponer contrasenas en el codigo."""

    # Clave secreta de Flask (para sesiones y seguridad)
    SECRET_KEY = os.getenv('SECRET_KEY', 'clave-por-defecto')

    # Conexion a PostgreSQL
    # SQLAlchemy usa esta variable para saber a que BD conectarse
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///fallback.db')

    # Desactiva un sistema de notificaciones que consume memoria
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Configuracion de JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-clave-por-defecto')
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # El token expira en 1 dia (86400 segundos)

    # APIs externas
    SENDGRID_API_KEY = os.getenv('SENDGRID_API_KEY')
    EXCHANGERATE_API_KEY = os.getenv('EXCHANGERATE_API_KEY')
    OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY')
    FACTURAPI_API_KEY = os.getenv('FACTURAPI_API_KEY')
    
    # Google OAuth
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
    
    # SendGrid para envio de tickets de compra
    SENDGRID_FROM_EMAIL = os.getenv('SENDGRID_FROM_EMAIL')