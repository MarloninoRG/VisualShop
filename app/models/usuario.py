from app import db
from datetime import datetime


class Usuario(db.Model):
    """Tabla 'usuarios' en la base de datos.
    Cada fila es un usuario del sistema (cajero, supervisor o admin).
    db.Model le dice a SQLAlchemy que esta clase representa una tabla."""

    __tablename__ = 'usuarios'

    # PRIMARY KEY: identificador unico, se autoincrementa
    id = db.Column(db.Integer, primary_key=True)

    # Datos del usuario
    nombre = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)  # Se guarda encriptada

    # Rol: 'admin', 'supervisor' o 'cajero'
    rol = db.Column(db.String(20), nullable=False, default='cajero')

    # Activo o inactivo (para "eliminar" sin borrar datos)
    activo = db.Column(db.Boolean, default=True)

    # Fecha de creacion (se llena automaticamente)
    creado_en = db.Column(db.DateTime, default=datetime.utcnow)

    # ---- Relaciones ----
    # Un usuario puede tener muchas ventas (relacion 1:N)
    ventas = db.relationship('Venta', backref='cajero', lazy=True)

    def to_dict(self):
        """Convierte el objeto a diccionario para enviarlo como JSON.
        Nunca incluimos el password en la respuesta."""
        return {
            'id': self.id,
            'nombre': self.nombre,
            'email': self.email,
            'rol': self.rol,
            'activo': self.activo,
            'creado_en': self.creado_en.isoformat()
        }

    def __repr__(self):
        return f'<Usuario {self.nombre} ({self.rol})>'