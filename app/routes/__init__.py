from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_cors import CORS

db = SQLAlchemy()
jwt = JWTManager()
bcrypt = Bcrypt()


def create_app():
    """Factory Pattern: crea y configura la app Flask."""

    app = Flask(__name__)

    from config.config import Config
    app.config.from_object(Config)

    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)
    CORS(app)

    # Registrar las rutas de autenticacion
    from app.routes.auth import auth_bp
    app.register_blueprint(auth_bp)

    # Crear las tablas si no existen
    with app.app_context():
        from app.models import Usuario, Producto, Categoria, Venta, DetalleVenta
        db.create_all()
        print("Base de datos lista - tablas creadas.")

    return app