import requests
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

exchange_bp = Blueprint('exchange', __name__, url_prefix='/api/exchange')

# Cache simple para no llamar a la API en cada peticion
cache = {
    'rates': None,
    'last_update': None
}


@exchange_bp.route('/rates', methods=['GET'])
@jwt_required()
def obtener_tasas():
    """Obtener tasas de cambio MXN a otras monedas.

    Usa la API gratuita de exchangerate.host
    Los resultados se cachean por 1 hora.
    """
    from datetime import datetime, timedelta

    # Revisar si el cache es reciente (menos de 1 hora)
    if cache['rates'] and cache['last_update']:
        if datetime.utcnow() - cache['last_update'] < timedelta(hours=1):
            return jsonify(cache['rates']), 200

    try:
        # API gratuita, no necesita key
        url = 'https://api.exchangerate-api.com/v4/latest/MXN'
        headers = {'User-Agent': 'VisualShop/1.0'}
        response = requests.get(url, headers=headers, timeout=10)

        if response.status_code != 200:
            return jsonify({'error': 'No se pudo obtener el tipo de cambio'}), 502

        data = response.json()
        rates = data.get('rates', {})

        resultado = {
            'base': 'MXN',
            'tasas': {
                'USD': round(rates.get('USD', 0), 4),
                'EUR': round(rates.get('EUR', 0), 4),
                'MXN': 1.0
            },
            'actualizado': datetime.utcnow().isoformat()
        }

        # Guardar en cache
        cache['rates'] = resultado
        cache['last_update'] = datetime.utcnow()

        return jsonify(resultado), 200

    except requests.exceptions.Timeout:
        return jsonify({'error': 'La consulta tardo demasiado'}), 504

    except Exception:
        return jsonify({'error': 'Error al consultar tipo de cambio'}), 500


@exchange_bp.route('/convertir/<float:precio>', methods=['GET'])
@jwt_required()
def convertir_precio(precio):
    """Convertir un precio de MXN a USD y EUR.

    Ejemplo: GET /api/exchange/convertir/18.50
    Regresa el precio en MXN, USD y EUR.
    """
    from datetime import datetime, timedelta

    # Obtener tasas (del cache o de la API)
    if cache['rates'] and cache['last_update']:
        if datetime.utcnow() - cache['last_update'] < timedelta(hours=1):
            tasas = cache['rates']['tasas']
            return jsonify({
                'precio_mxn': round(precio, 2),
                'precio_usd': round(precio * tasas['USD'], 2),
                'precio_eur': round(precio * tasas['EUR'], 2)
            }), 200

    # Si no hay cache, llamar a la API primero
    try:
        url = 'https://api.exchangerate-api.com/v4/latest/MXN'
        headers = {'User-Agent': 'VisualShop/1.0'}
        response = requests.get(url, headers=headers, timeout=10)

        if response.status_code != 200:
            return jsonify({'error': 'No se pudo obtener el tipo de cambio'}), 502

        data = response.json()
        rates = data.get('rates', {})

        usd = rates.get('USD', 0)
        eur = rates.get('EUR', 0)

        # Actualizar cache
        cache['rates'] = {
            'base': 'MXN',
            'tasas': {'USD': round(usd, 4), 'EUR': round(eur, 4), 'MXN': 1.0},
            'actualizado': datetime.utcnow().isoformat()
        }
        cache['last_update'] = datetime.utcnow()

        return jsonify({
            'precio_mxn': round(precio, 2),
            'precio_usd': round(precio * usd, 2),
            'precio_eur': round(precio * eur, 2)
        }), 200

    except Exception:
        return jsonify({'error': 'Error al convertir precio'}), 500