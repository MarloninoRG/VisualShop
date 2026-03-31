from app import db
from datetime import datetime


class Categoria(db.Model):
    """Tabla 'categorias': agrupa los productos (Bebidas, Abarrotes, etc.)"""

    __tablename__ = 'categorias'

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(80), unique=True, nullable=False)

    # Relacion: una categoria tiene muchos productos
    productos = db.relationship('Producto', backref='categoria', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre
        }


class Producto(db.Model):
    """Tabla 'productos': cada fila es un producto del inventario.
    Esta es tu tabla principal como Rol 1."""

    __tablename__ = 'productos'

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(150), nullable=False)
    descripcion = db.Column(db.String(300), default='')
    codigo_barras = db.Column(db.String(50), unique=True, nullable=True)

    # Precios y stock
    precio = db.Column(db.Float, nullable=False)
    stock = db.Column(db.Integer, nullable=False, default=0)
    stock_minimo = db.Column(db.Integer, default=5)  # Alerta cuando baje de aqui

    # FK: a que categoria pertenece
    categoria_id = db.Column(db.Integer, db.ForeignKey('categorias.id'), nullable=True)

    activo = db.Column(db.Boolean, default=True)
    creado_en = db.Column(db.DateTime, default=datetime.utcnow)
    actualizado_en = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacion: un producto aparece en muchos detalles de venta
    detalles_venta = db.relationship('DetalleVenta', backref='producto', lazy=True)

    @property
    def stock_bajo(self):
        """Retorna True si el stock esta por debajo del minimo."""
        return self.stock <= self.stock_minimo

    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'descripcion': self.descripcion,
            'codigo_barras': self.codigo_barras,
            'precio': self.precio,
            'stock': self.stock,
            'stock_minimo': self.stock_minimo,
            'stock_bajo': self.stock_bajo,
            'categoria': self.categoria.to_dict() if self.categoria else None,
            'activo': self.activo,
            'creado_en': self.creado_en.isoformat()
        }