import requests
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

barcode_bp = Blueprint('barcode', __name__, url_prefix='/api/barcode')


@barcode_bp.route('/<string:codigo>', methods=['GET'])
@jwt_required()
def buscar_por_codigo(codigo):
    """Buscar informacion de un producto por su codigo de barras.

    Usa la API gratuita de Open Food Facts.
    Ejemplo: GET /api/barcode/3017620422003
    """
    try:
        url = f'https://world.openfoodfacts.org/api/v2/product/{codigo}.json?lc=es'
        headers = {
            'User-Agent': 'VisualShop/1.0 (marlon@visualshop.com)'
        }
        response = requests.get(url, headers=headers, timeout=15)

        if response.status_code != 200:
            return jsonify({
                'encontrado': False,
                'mensaje': 'No se pudo conectar con el servicio de codigos de barras'
            }), 502

        data = response.json()

        if data.get('status') != 1:
            return jsonify({
                'encontrado': False,
                'mensaje': 'Producto no encontrado en la base de datos externa',
                'codigo_barras': codigo
            }), 404

        producto = data.get('product', {})

        return jsonify({
            'encontrado': True,
            'codigo_barras': codigo,
            'sugerencia': {
                'nombre': producto.get('product_name', ''),
                'marca': producto.get('brands', ''),
                'descripcion': producto.get('generic_name', ''),
                'imagen': producto.get('image_url', ''),
                'categorias': producto.get('categories', '')
            }
        }), 200

    except requests.exceptions.Timeout:
        return jsonify({
            'encontrado': False,
            'mensaje': 'La consulta tardo demasiado, intenta de nuevo'
        }), 504

    except Exception as e:
        return jsonify({
            'encontrado': False,
            'mensaje': 'Error al consultar el codigo de barras'
        }), 500