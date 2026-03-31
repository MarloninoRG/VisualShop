from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_cors import CORS

# Creamos las extensiones FUERA de la funcion para poder importarlas
# desde otros archivos (ej: from app import db)
db = SQLAlchemy()
jwt = JWTManager()
bcrypt = Bcrypt()


def create_app():
    """Factory Pattern: funcion que CREA y CONFIGURA la app Flask.

    Por que una funcion y no directo?
    - Permite crear multiples instancias (util para testing)
    - Evita problemas de importacion circular
    - Es la forma profesional de estructurar Flask
    """

    # 1. Crear la instancia de Flask
    app = Flask(__name__)

    # 2. Cargar configuracion desde config.py
    from config.config import Config
    app.config.from_object(Config)

    # 3. Inicializar extensiones con esta app
    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)
    CORS(app)  # Permite peticiones desde el frontend

    # 4. Registrar rutas (blueprints) - las iremos agregando
    from app.routes.auth import auth_bp
    app.register_blueprint(auth_bp)
    
    from app.routes.test import test_bp
    app.register_blueprint(test_bp)

    from app.routes.categorias import categorias_bp
    app.register_blueprint(categorias_bp)

    from app.routes.productos import productos_bp
    app.register_blueprint(productos_bp)
    
    from app.routes.barcode import barcode_bp
    app.register_blueprint(barcode_bp)
    
    from app.routes.ventas import ventas_bp
    app.register_blueprint(ventas_bp)

    from app.routes.exchange import exchange_bp
    app.register_blueprint(exchange_bp)

    # 5. Crear las tablas si no existen
    with app.app_context():
        from app.models import Usuario, Producto, Categoria, Venta, DetalleVenta
        db.create_all()
        print("Base de datos lista - tablas creadas.")

    return app