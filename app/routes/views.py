from flask import Blueprint, render_template

views_bp = Blueprint('views', __name__)


@views_bp.route('/')
def landing():
    """Pagina principal / landing page."""
    return render_template('landing.html')


@views_bp.route('/dashboard')
def dashboard():
    """Dashboard principal (requiere login)."""
    return render_template('dashboard/index.html')


@views_bp.route('/pos')
def pos():
    """Pantalla de nueva venta."""
    return render_template('ventas/pos.html')

@views_bp.route('/productos')
def productos():
    """Gestion de productos e inventario."""
    return render_template('productos/index.html')


@views_bp.route('/ventas')
def ventas():
    """Historial de ventas."""
    return render_template('ventas/index.html')


@views_bp.route('/usuarios')
def usuarios():
    """Gestion de usuarios (solo admin)."""
    return render_template('usuarios/index.html')