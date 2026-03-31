# Este archivo permite hacer:
#   from app.models import Usuario, Producto, Venta
# en vez de importar cada uno por separado

from app.models.usuario import Usuario
from app.models.producto import Producto, Categoria
from app.models.venta import Venta, DetalleVenta