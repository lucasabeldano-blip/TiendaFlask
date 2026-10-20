from flask import Flask, jsonify, request, render_template, url_for, session
import sqlite3
import os
import uuid
import hmac
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash

# ------------------------------------------------------------
# Configuración general del backend
# ------------------------------------------------------------
# Flask crea la app web y la clave secreta guarda datos de sesión
# como el usuario logueado y su rol (admin o cliente).
app = Flask(__name__)

app.secret_key = "una_clave_secreta"

base_de_datos = []
contador_id = 1


# ------------------------------------------------------------
# Base de datos
# ------------------------------------------------------------
# Esta función centraliza la conexión con SQLite.
# El row_factory permite acceder a los datos como si fueran diccionarios.
def conectar_db():

    db = sqlite3.connect("tienda.db")

    db.row_factory = sqlite3.Row

    return db

# Si en una versión anterior la tabla no tenía la columna categoria,
# se crea automáticamente para que el filtro por categorías funcione.
def inicializar_productos():

    db = conectar_db()

    columnas = db.execute("PRAGMA table_info(productos)").fetchall()
    nombres_columnas = {columna[1] for columna in columnas}

    if "categoria" not in nombres_columnas:

        db.execute(
            "ALTER TABLE productos ADD COLUMN categoria TEXT"
        )

    # Esta tabla guarda cantidades por producto y talle, pero no reserva stock.
    # La restricción UNIQUE mantiene una sola línea por talle dentro de cada carrito.
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS carrito_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            carrito_id TEXT NOT NULL,
            id_producto INTEGER NOT NULL,
            talle TEXT NOT NULL CHECK (talle IN ('S', 'M', 'L', 'XL')),
            cantidad INTEGER NOT NULL CHECK (cantidad > 0),
            UNIQUE (carrito_id, id_producto, talle)
        )
        """
    )

    db.commit()
    db.close()


inicializar_productos()


# Cada usuario usa su propio carrito. Si el usuario está logueado, el carrito
# coincide con su id de usuario para que no haya varios carritos simultáneos
# para la misma cuenta. Los carritos temporales de invitado siguen usando UUID.
def obtener_id_carrito():

    if "usuario_id" in session and session["usuario_id"] is not None:
        return str(session["usuario_id"])

    if "usuario" in session and session["usuario"]:
        usuario = session["usuario"]
        db = conectar_db()
        fila = db.execute(
            "SELECT id FROM usuarios WHERE usuario = ?",
            (usuario,)
        ).fetchone()
        db.close()

        if fila is not None:
            session["usuario_id"] = fila["id"]
            return str(fila["id"])

    if "carrito_id" not in session:
        session["carrito_id"] = uuid.uuid4().hex

    return session["carrito_id"]


def limpiar_carritos_huerfanos():

    db = conectar_db()

    try:
        db.execute(
            """
            DELETE FROM carrito_items
            WHERE carrito_id GLOB '[0-9]*'
              AND carrito_id NOT IN (SELECT CAST(id AS TEXT) FROM usuarios)
            """
        )
        db.commit()
    finally:
        db.close()


# El contador se agrega a todas las plantillas para que el acceso al carrito
# permanezca visible mientras el cliente recorre el sitio.
@app.context_processor
def contexto_carrito():

    limpiar_carritos_huerfanos()

    carrito_id = obtener_id_carrito()

    db = conectar_db()

    cantidad = db.execute(
        "SELECT COALESCE(SUM(cantidad), 0) FROM carrito_items WHERE carrito_id = ?",
        (carrito_id,)
    ).fetchone()[0]

    db.close()

    return {"cantidad_carrito": cantidad}

# ------------------------------------------------------------
# Rutas públicas: páginas de inicio y navegación general
# ------------------------------------------------------------
@app.route('/')
def bienvenida():

    return render_template('bienvenida.html')


@app.route('/index')
def index():

    return render_template('tienda.html')


@app.route('/indexlogin')
def indexlogin():

    return render_template('tiendasinlogin.html')


@app.route('/categorias')
def categorias():

    return render_template('categorias.html')


# ------------------------------------------------------------
# API de categorías para la página de búsqueda
# ------------------------------------------------------------
@app.route('/api/categorias', methods=['GET'])
def api_categorias():

    db = conectar_db()

    resultado = db.execute(
        """
        SELECT MIN(id_producto) AS id_categoria, categoria AS nombre
        FROM productos
        WHERE categoria IS NOT NULL AND TRIM(categoria) <> ''
        GROUP BY categoria
        ORDER BY categoria COLLATE NOCASE
        """
    ).fetchall()

    db.close()

    return jsonify([
        dict(categoria)
        for categoria in resultado
    ])


# ------------------------------------------------------------
# Detalle de producto individual
# ------------------------------------------------------------
@app.route('/producto/<int:id_producto>')
def detalle_producto(id_producto):

    db = conectar_db()

    producto = db.execute(
        """
        SELECT
            id_producto,
            precio,
            (COALESCE(unidades_s, 0) + COALESCE(unidades_m, 0) + COALESCE(unidades_l, 0) + COALESCE(unidades_xl, 0)) AS unidades_disponibles,
            descripcion,
            descripcion_completa,
            categoria,
            unidades_s,
            unidades_m,
            unidades_l,
            unidades_xl,
            imagen
        FROM productos
        WHERE id_producto = ?
        """,
        (id_producto,)
    ).fetchone()

    db.close()

    if producto is None:

        return jsonify({"error": "Producto no encontrado"}), 404

    return render_template('detalle_producto.html', producto=producto)



# ------------------------------------------------------------
# Autenticación y cuenta del usuario
# ------------------------------------------------------------
def verificar_contraseña(db, id_usuario, contraseña_guardada, contraseña_ingresada):

    if contraseña_guardada.startswith(("scrypt:", "pbkdf2:")):
        try:
            return check_password_hash(contraseña_guardada, contraseña_ingresada)
        except (TypeError, ValueError):
            return False

    coincide = hmac.compare_digest(
        contraseña_guardada.encode("utf-8"),
        contraseña_ingresada.encode("utf-8")
    )

    if coincide:
        db.execute(
            "UPDATE usuarios SET contraseña = ? WHERE id = ?",
            (generate_password_hash(contraseña_ingresada), id_usuario)
        )
        db.commit()

    return coincide


@app.route('/cambiarpass', methods=["GET", "POST"])
def cambiarpass():

    if request.method == "GET":

        return render_template("cambiarpass.html")


    datos = request.get_json()

    usuario = datos["usuario"]

    contraseña_actual = datos["contraseñaActual"]

    contraseña_nueva = datos["contraseñaNueva"]


    db = conectar_db()


    resultado = db.execute(
        """
        SELECT id, contraseña
        FROM usuarios
        WHERE usuario = ?
        """,
        (usuario,)
    ).fetchone()


    if resultado is None or not verificar_contraseña(
        db,
        resultado["id"],
        resultado["contraseña"],
        contraseña_actual
    ):

        db.close()

        return jsonify({
            "error": "El usuario o la contraseña actual son incorrectos"
        }), 401


    db.execute(
        """
        UPDATE usuarios
        SET contraseña = ?
        WHERE usuario = ?
        """,
        (generate_password_hash(contraseña_nueva), usuario)
    )


    db.commit()

    db.close()


    return jsonify({
        "mensaje": "Contraseña cambiada correctamente"
    }), 200




@app.route('/login', methods=["GET", "POST"])
def login():

    if request.method == "GET":

        return render_template("login.html")


    datos = request.get_json()

    usuario = datos["usuario"]

    contraseña = datos["contraseña"]


    db = conectar_db()


    resultado = db.execute(
        """
        SELECT *
        FROM usuarios
        WHERE usuario = ?
        """,
        (usuario,)
    ).fetchone()


    if resultado is None or not verificar_contraseña(
        db,
        resultado["id"],
        resultado["contraseña"],
        contraseña
    ):
        db.close()
        return jsonify({
            "error": "Usuario o contraseña incorrectos"
        }), 401

    db.close()


    session["usuario"] = resultado["usuario"]
    session["usuario_id"] = resultado["id"]
    session["rol"] = resultado["rol"]

    limpiar_carritos_huerfanos()

    return jsonify({

        "mensaje": "Inicio de sesión correcto",

        "rol": resultado["rol"]

    })



@app.route("/register", methods=["GET", "POST"])
def register():

    if request.method == "GET":

        return render_template("register.html")


    datos = request.get_json()

    usuario = datos["usuario"]

    contraseña = datos["contraseña"]


    db = conectar_db()


    usuario_existente = db.execute(
        """
        SELECT *
        FROM usuarios
        WHERE usuario = ?
        """,
        (usuario,)
    ).fetchone()


    if usuario_existente:

        db.close()

        return jsonify({
            "error": "El usuario ya existe"
        }), 400


    contraseña_hash = generate_password_hash(contraseña)

    cursor = db.execute(
        """
        INSERT INTO usuarios (usuario, contraseña, rol)
        VALUES (?, ?, ?)
        """,
        (usuario, contraseña_hash, "cliente")
    )
    db.commit()

    session["usuario"] = usuario
    session["usuario_id"] = cursor.lastrowid
    session["rol"] = "cliente"

    db.close()

    limpiar_carritos_huerfanos()

    return jsonify({
        "mensaje": "Usuario registrado correctamente"
    }), 201




# ------------------------------------------------------------
# Panel administrativo
# ------------------------------------------------------------
@app.route("/admin")
def admin():

    if session.get("rol") != "admin":

        return jsonify({"error": "No autorizado"}), 403


    return render_template('admin.html')



# ------------------------------------------------------------
# CRUD de productos para el admin
# ------------------------------------------------------------
# Este endpoint permite listar, crear, editar y borrar productos
# desde la vista de administración.
@app.route(
    "/api/productos",
    methods=["GET", "POST", "PUT", "DELETE"]
)
def productos():

   
    if session.get("rol") != "admin":

        return jsonify({
            "error": "No autorizado"
        }), 403


    db = conectar_db()




    if request.method == "GET":

        resultado = db.execute(
            """
            SELECT
                id_producto,
                precio,
                (COALESCE(unidades_s, 0) + COALESCE(unidades_m, 0) + COALESCE(unidades_l, 0) + COALESCE(unidades_xl, 0)) AS unidades_disponibles,
                descripcion,
                descripcion_completa,
                categoria,
                unidades_s,
                unidades_m,
                unidades_l,
                unidades_xl,
                imagen
            FROM productos
            """
        ).fetchall()


        db.close()


        return jsonify([
            dict(producto)
            for producto in resultado
        ])




    elif request.method == "POST":

       

        precio = request.form["precio"]

        descripcion = request.form["descripcion"]

        descripcion_completa = request.form["descripcion_completa"]

        unidades_s = request.form["unidades_s"]

        unidades_m = request.form["unidades_m"]

        unidades_l = request.form["unidades_l"]

        unidades_xl = request.form["unidades_xl"]



        imagen = request.files.get("imagen")


        if not imagen:

            db.close()

            return jsonify({
                "error": "No se seleccionó ninguna imagen"
            }), 400



        extensiones_permitidas = {

            ".jpg",

            ".jpeg",

            ".png",

            ".webp"

        }


        extension = os.path.splitext(
            imagen.filename
        )[1].lower()


        if extension not in extensiones_permitidas:

            db.close()

            return jsonify({
                "error": "Tipo de imagen no permitido"
            }), 400


        nombre_imagen = secure_filename(
            imagen.filename
        )


       
        carpeta = os.path.join(
            "static",
            "img",
            "productos"
        )


        os.makedirs(
            carpeta,
            exist_ok=True
        )


    

        ruta = os.path.join(
            carpeta,
            nombre_imagen
        )


     

        imagen.save(ruta)


     
        db.execute(
            """
            INSERT INTO productos
            (
                precio,
                descripcion,
                descripcion_completa,
                categoria,
                unidades_s,
                unidades_m,
                unidades_l,
                unidades_xl,
                imagen
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                precio,
                descripcion,
                descripcion_completa,
                request.form.get("categoria", "").strip(),
                unidades_s,
                unidades_m,
                unidades_l,
                unidades_xl,
                nombre_imagen
            )
        )


        db.commit()

        db.close()


        return jsonify({
            "mensaje": "Producto creado correctamente"
        }), 201




    elif request.method == "PUT":

        id_producto = request.form["id_producto"]

        imagen = request.files.get("imagen")

        producto = db.execute(
            """
            SELECT imagen
            FROM productos
            WHERE id_producto = ?
            """,
            (id_producto,)
        ).fetchone()

        if producto is None:

            db.close()

            return jsonify({
                "error": "Producto no encontrado"
            }), 404

        campos_a_actualizar = []

        valores_a_actualizar = []

        datos_actualizables = {
            "precio": request.form.get("precio", "").strip(),
            "descripcion": request.form.get("descripcion", "").strip(),
            "descripcion_completa": request.form.get(
                "descripcion_completa",
                ""
            ).strip(),
            "categoria": request.form.get("categoria", "").strip(),
            "unidades_s": request.form.get("unidades_s", "").strip(),
            "unidades_m": request.form.get("unidades_m", "").strip(),
            "unidades_l": request.form.get("unidades_l", "").strip(),
            "unidades_xl": request.form.get("unidades_xl", "").strip()
        }

        for campo, valor in datos_actualizables.items():

            if valor != "":

                campos_a_actualizar.append(f"{campo} = ?")

                valores_a_actualizar.append(valor)

        nombre_imagen = producto["imagen"]

        if imagen and imagen.filename:

            extensiones_permitidas = {
                ".jpg",
                ".jpeg",
                ".png",
                ".webp"
            }

            extension = os.path.splitext(
                imagen.filename
            )[1].lower()

            if extension not in extensiones_permitidas:

                db.close()

                return jsonify({
                    "error": "Tipo de imagen no permitido"
                }), 400

            nombre_imagen = secure_filename(
                imagen.filename
            )

            carpeta = os.path.join(
                "static",
                "img",
                "productos"
            )

            os.makedirs(
                carpeta,
                exist_ok=True
            )

            imagen.save(
                os.path.join(carpeta, nombre_imagen)
            )

            campos_a_actualizar.append("imagen = ?")

            valores_a_actualizar.append(nombre_imagen)

        if not campos_a_actualizar:

            db.close()

            return jsonify({
                "error": "No hay datos para actualizar"
            }), 400

        valores_a_actualizar.append(id_producto)


        resultado = db.execute(
            """
            UPDATE productos
            SET """ + ", ".join(campos_a_actualizar) + """
            WHERE id_producto = ?
            """,
            valores_a_actualizar
        )


        db.commit()

        db.close()


        if resultado.rowcount == 0:

            return jsonify({
                "error": "Producto no encontrado"
            }), 404

        if (
            imagen
            and imagen.filename
            and producto["imagen"]
            and producto["imagen"] != nombre_imagen
        ):

            ruta_imagen_anterior = os.path.join(
                "static",
                "img",
                "productos",
                producto["imagen"]
            )

            if os.path.exists(ruta_imagen_anterior):

                os.remove(ruta_imagen_anterior)


        return jsonify({
            "mensaje": "Producto actualizado correctamente"
        })




    elif request.method == "DELETE":

        datos = request.get_json()


        id_producto = datos["id_producto"]


  

        producto = db.execute(
            """
            SELECT imagen
            FROM productos
            WHERE id_producto = ?
            """,
            (id_producto,)
        ).fetchone()


        if producto is None:

            db.close()

            return jsonify({
                "error": "Producto no encontrado"
            }), 404


       
        db.execute(
            """
            DELETE FROM productos
            WHERE id_producto = ?
            """,
            (id_producto,)
        )


        db.commit()

        db.close()


        

        if producto["imagen"]:

            ruta_imagen = os.path.join(
                "static",
                "img",
                "productos",
                producto["imagen"]
            )


            if os.path.exists(ruta_imagen):

                os.remove(ruta_imagen)


        return jsonify({
            "mensaje": "Producto eliminado correctamente"
        })


# ------------------------------------------------------------
# Catálogo para clientes
# ------------------------------------------------------------
# Este endpoint devuelve los productos visibles para la tienda.
# Si la URL trae una categoría, aplica el filtro para mostrar solo esa sección.
@app.route("/api/productos-tienda", methods=["GET"])
def productos_tienda():

    db = conectar_db()

    categoria = request.args.get("categoria", "").strip()

    query = """
        SELECT
            id_producto,
            precio,
            (COALESCE(unidades_s, 0) + COALESCE(unidades_m, 0) + COALESCE(unidades_l, 0) + COALESCE(unidades_xl, 0)) AS unidades_disponibles,
            descripcion,
            categoria,
            imagen
        FROM productos
    """

    parametros = []

    if categoria:
        query += " WHERE categoria COLLATE NOCASE = ?"
        parametros.append(categoria)

    resultado = db.execute(query, parametros).fetchall()

    db.close()

    return jsonify([
        dict(producto)
        for producto in resultado
    ])




# ------------------------------------------------------------
# Carrito de compras y confirmación del pedido
# ------------------------------------------------------------
# Solo estos talles se pueden convertir a nombres de columna de stock; así el
# cliente nunca puede enviar un nombre de columna arbitrario a una consulta SQL.
COLUMNAS_TALLE = {
    "S": "unidades_s",
    "M": "unidades_m",
    "L": "unidades_l",
    "XL": "unidades_xl"
}


# Busca los artículos de un carrito y calcula sus subtotales sin modificar stock.
def obtener_items_carrito(db, carrito_id):

    filas = db.execute(
        """
        SELECT
            carrito.id_producto,
            carrito.talle,
            carrito.cantidad,
            productos.descripcion,
            productos.imagen,
            productos.precio,
            CASE carrito.talle
                WHEN 'S' THEN COALESCE(productos.unidades_s, 0)
                WHEN 'M' THEN COALESCE(productos.unidades_m, 0)
                WHEN 'L' THEN COALESCE(productos.unidades_l, 0)
                WHEN 'XL' THEN COALESCE(productos.unidades_xl, 0)
            END AS stock_disponible
        FROM carrito_items AS carrito
        JOIN productos ON productos.id_producto = carrito.id_producto
        WHERE carrito.carrito_id = ?
        ORDER BY carrito.id
        """,
        (carrito_id,)
    ).fetchall()

    items = []

    for fila in filas:
        item = dict(fila)
        item["precio"] = float(item["precio"] or 0)
        item["subtotal"] = item["precio"] * item["cantidad"]
        items.append(item)

    return items


# Entrega la página del carrito; el contenido se consulta por JSON al cargarla.
@app.route("/carrito")
def ver_carrito():

    return render_template("carrito.html")


# Este endpoint alimenta la vista del carrito y muestra el conteo actualizado.
@app.route("/api/carrito", methods=["GET"])
def api_carrito():

    carrito_id = obtener_id_carrito()

    db = conectar_db()
    items = obtener_items_carrito(db, carrito_id)
    db.close()

    return jsonify({
        "items": items,
        "cantidad": sum(item["cantidad"] for item in items),
        "total": sum(item["subtotal"] for item in items)
    })


# Agrega un producto y talle al carrito; consulta disponibilidad, pero no reserva
# ni descuenta unidades. El stock se vuelve a validar durante la confirmación.
@app.route("/agregar_al_carrito", methods=["POST"])
def agregar_al_carrito():

    datos = request.get_json(silent=True) or {}

    try:
        id_producto = int(datos.get("id_producto"))
        cantidad = int(datos.get("cantidad", 1))
    except (TypeError, ValueError):
        return jsonify({"error": "El producto o la cantidad no son válidos."}), 400

    talla = str(datos.get("talla", "")).upper()

    if talla not in COLUMNAS_TALLE:
        return jsonify({"error": "Seleccioná un talle antes de agregar el producto."}), 400

    if cantidad < 1:
        return jsonify({"error": "La cantidad debe ser al menos una unidad."}), 400

    carrito_id = obtener_id_carrito()
    columna_talle = COLUMNAS_TALLE[talla]
    db = conectar_db()

    try:
        # El bloqueo serializa la lectura y escritura de las líneas del carrito.
        db.execute("BEGIN IMMEDIATE")
        producto = db.execute(
            f"SELECT {columna_talle} AS stock FROM productos WHERE id_producto = ?",
            (id_producto,)
        ).fetchone()

        if producto is None:
            db.rollback()
            return jsonify({"error": "No se encontró el producto."}), 404

        try:
            stock_disponible = int(float(producto["stock"] or 0))
        except (TypeError, ValueError):
            db.rollback()
            return jsonify({"error": "El stock guardado no es válido."}), 400

        linea_actual = db.execute(
            """
            SELECT cantidad FROM carrito_items
            WHERE carrito_id = ? AND id_producto = ? AND talle = ?
            """,
            (carrito_id, id_producto, talla)
        ).fetchone()
        cantidad_actual = linea_actual["cantidad"] if linea_actual else 0

        if cantidad_actual + cantidad > stock_disponible:
            db.rollback()
            return jsonify({"error": f"Solo hay {stock_disponible} unidades del talle {talla}."}), 409

        db.execute(
            """
            INSERT INTO carrito_items (carrito_id, id_producto, talle, cantidad)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (carrito_id, id_producto, talle)
            DO UPDATE SET cantidad = excluded.cantidad
            """,
            (carrito_id, id_producto, talla, cantidad_actual + cantidad)
        )
        total_carrito = db.execute(
            "SELECT COALESCE(SUM(cantidad), 0) FROM carrito_items WHERE carrito_id = ?",
            (carrito_id,)
        ).fetchone()[0]
        db.commit()

    except sqlite3.Error as error:
        db.rollback()
        return jsonify({"error": f"No se pudo actualizar el carrito: {error}"}), 500

    finally:
        db.close()

    return jsonify({
        "mensaje": "Producto agregado al carrito. El stock se descuenta al finalizar la compra.",
        "cantidad": total_carrito
    }), 201


# Cambia la cantidad de una línea sin reservar stock; la disponibilidad se
# controla ahora y se vuelve a controlar de forma definitiva al finalizar.
@app.route("/actualizar_carrito", methods=["POST"])
def actualizar_carrito():

    carrito_id = obtener_id_carrito()
    datos = request.get_json(silent=True) or {}

    try:
        id_producto = int(datos.get("id_producto"))
        cantidad = int(datos.get("cantidad"))
    except (TypeError, ValueError):
        return jsonify({"error": "El producto o la cantidad no son válidos."}), 400

    talla = str(datos.get("talla", "")).upper()

    if not carrito_id or talla not in COLUMNAS_TALLE or cantidad < 1:
        return jsonify({"error": "La línea del carrito no es válida."}), 400

    columna_talle = COLUMNAS_TALLE[talla]
    db = conectar_db()

    try:
        db.execute("BEGIN IMMEDIATE")
        producto = db.execute(
            f"SELECT {columna_talle} AS stock FROM productos WHERE id_producto = ?",
            (id_producto,)
        ).fetchone()
        linea = db.execute(
            """
            SELECT id FROM carrito_items
            WHERE carrito_id = ? AND id_producto = ? AND talle = ?
            """,
            (carrito_id, id_producto, talla)
        ).fetchone()

        if producto is None or linea is None:
            db.rollback()
            return jsonify({"error": "No se encontró esa línea del carrito."}), 404

        stock_disponible = int(float(producto["stock"] or 0))

        if cantidad > stock_disponible:
            db.rollback()
            return jsonify({"error": f"Solo hay {stock_disponible} unidades del talle {talla}."}), 409

        db.execute(
            """
            UPDATE carrito_items SET cantidad = ?
            WHERE carrito_id = ? AND id_producto = ? AND talle = ?
            """,
            (cantidad, carrito_id, id_producto, talla)
        )
        db.commit()

    except sqlite3.Error as error:
        db.rollback()
        return jsonify({"error": f"No se pudo actualizar el carrito: {error}"}), 500

    finally:
        db.close()

    return jsonify({"mensaje": "Cantidad actualizada."})


# Elimina solo el producto y talle indicado, sin afectar las existencias reales.
@app.route("/eliminar_del_carrito", methods=["POST"])
def eliminar_del_carrito():

    carrito_id = obtener_id_carrito()
    datos = request.get_json(silent=True) or {}

    try:
        id_producto = int(datos.get("id_producto"))
    except (TypeError, ValueError):
        return jsonify({"error": "El producto no es válido."}), 400

    talla = str(datos.get("talla", "")).upper()

    if not carrito_id or talla not in COLUMNAS_TALLE:
        return jsonify({"error": "La línea del carrito no es válida."}), 400

    db = conectar_db()
    db.execute(
        """
        DELETE FROM carrito_items
        WHERE carrito_id = ? AND id_producto = ? AND talle = ?
        """,
        (carrito_id, id_producto, talla)
    )
    db.commit()
    db.close()

    return jsonify({"mensaje": "Producto eliminado del carrito."})


# Vacía todas las líneas de este visitante; tampoco modifica el inventario.
@app.route("/vaciar_carrito", methods=["POST"])
def vaciar_carrito():

    carrito_id = obtener_id_carrito()

    db = conectar_db()
    db.execute("DELETE FROM carrito_items WHERE carrito_id = ?", (carrito_id,))
    db.commit()
    db.close()

    return jsonify({"mensaje": "El carrito está vacío."})


# Confirma el pedido solo para clientes autenticados. BEGIN IMMEDIATE evita que
# dos compras simultáneas gasten las mismas unidades antes de validar el stock.
@app.route("/finalizar_compra", methods=["POST"])
def finalizar_compra():

    if "usuario" not in session:
        return jsonify({"error": "Iniciá sesión para finalizar la compra."}), 401

    carrito_id = obtener_id_carrito()

    if not carrito_id:
        return jsonify({"error": "El carrito está vacío."}), 400

    db = conectar_db()

    try:
        db.execute("BEGIN IMMEDIATE")
        lineas = db.execute(
            """
            SELECT id_producto, talle, cantidad
            FROM carrito_items
            WHERE carrito_id = ?
            """,
            (carrito_id,)
        ).fetchall()

        if not lineas:
            db.rollback()
            return jsonify({"error": "El carrito está vacío."}), 400

        total = 0

        # Primero se valida y descuenta cada talle dentro de una misma transacción.
        # Ante cualquier faltante se revierte todo, nunca queda una compra parcial.
        for linea in lineas:
            columna_talle = COLUMNAS_TALLE[linea["talle"]]
            producto = db.execute(
                f"""
                SELECT descripcion, precio, {columna_talle} AS stock
                FROM productos WHERE id_producto = ?
                """,
                (linea["id_producto"],)
            ).fetchone()

            if producto is None:
                db.rollback()
                return jsonify({"error": "Un producto del carrito ya no está disponible."}), 409

            stock_disponible = int(float(producto["stock"] or 0))

            if stock_disponible < linea["cantidad"]:
                db.rollback()
                return jsonify({
                    "error": f"Stock insuficiente para {producto['descripcion']} talle {linea['talle']}. Disponible: {stock_disponible}."
                }), 409

            actualizacion = db.execute(
                f"""
                UPDATE productos
                SET {columna_talle} = COALESCE({columna_talle}, 0) - ?
                WHERE id_producto = ? AND COALESCE({columna_talle}, 0) >= ?
                """,
                (linea["cantidad"], linea["id_producto"], linea["cantidad"])
            )

            if actualizacion.rowcount != 1:
                db.rollback()
                return jsonify({"error": "El stock cambió. Actualizá el carrito e intentá nuevamente."}), 409

            total += float(producto["precio"] or 0) * linea["cantidad"]

        db.execute("DELETE FROM carrito_items WHERE carrito_id = ?", (carrito_id,))
        db.commit()

    except sqlite3.Error as error:
        db.rollback()
        return jsonify({"error": f"No se pudo finalizar la compra: {error}"}), 500

    finally:
        db.close()

    return jsonify({
        "mensaje": "Compra realizada correctamente.",
        "total": total
    }), 200


@app.route('/api/productos/<categoria>', methods=['GET'])
def productos_por_categoria(categoria):
    db = conectar_db()

    resultado = db.execute(
        """
        SELECT
            id_producto,
            precio,
            (COALESCE(unidades_s, 0) + COALESCE(unidades_m, 0) + COALESCE(unidades_l, 0) + COALESCE(unidades_xl, 0)) AS unidades_disponibles,
            descripcion,
            categoria,
            imagen
        FROM productos
        WHERE categoria = ?
        """,
        (categoria,)
    ).fetchall()

    db.close()

    return jsonify([
        dict(producto)
        for producto in resultado
    ])

if __name__ == '__main__':

    app.run(debug=True)