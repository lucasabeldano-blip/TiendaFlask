from flask import Flask, jsonify, request, render_template, url_for, session
import sqlite3
import os
from werkzeug.utils import secure_filename


app = Flask(__name__)

app.secret_key = "una_clave_secreta"

base_de_datos = []
contador_id = 1


def conectar_db():

    db = sqlite3.connect("tienda.db")

    db.row_factory = sqlite3.Row

    return db


def inicializar_productos():

    db = conectar_db()

    columnas = db.execute("PRAGMA table_info(productos)").fetchall()
    nombres_columnas = {columna[1] for columna in columnas}

    if "categoria" not in nombres_columnas:

        db.execute(
            "ALTER TABLE productos ADD COLUMN categoria TEXT"
        )

    db.commit()
    db.close()


inicializar_productos()



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

        return "Producto no encontrado", 404

    return render_template('detalle_producto.html', producto=producto)



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
        SELECT *
        FROM usuarios
        WHERE usuario = ? AND contraseña = ?
        """,
        (usuario, contraseña_actual)
    ).fetchone()


    if resultado is None:

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
        (contraseña_nueva, usuario)
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
        WHERE usuario = ? AND contraseña = ?
        """,
        (usuario, contraseña)
    ).fetchone()


    db.close()


    if resultado is None:

        return jsonify({
            "error": "Usuario o contraseña incorrectos"
        }), 401


    session["usuario"] = resultado["usuario"]

    session["rol"] = resultado["rol"]


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


    db.execute(
        """
        INSERT INTO usuarios
        (usuario, contraseña, rol)
        VALUES (?, ?, ?)
        """,
        (
            usuario,
            contraseña,
            "cliente"
        )
    )


    db.commit()

    db.close()

    session["usuario"] = usuario
    session["rol"] = "cliente"

    return jsonify({
        "mensaje": "Usuario registrado correctamente"
    }), 201




@app.route("/admin")
def admin():

    if session.get("rol") != "admin":

        return "No autorizado", 403


    return render_template('admin.html')



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




@app.route("/api/comprar", methods=["POST"])
def comprar():

    if "usuario" not in session:

        return jsonify({
            "error": "Tenés que iniciar sesión para comprar"
        }), 401


    datos = request.get_json()


    id_producto = datos["id_producto"]

    talla = datos.get("talla")

    columnas_talle = {
        "S": "unidades_s",
        "M": "unidades_m",
        "L": "unidades_l",
        "XL": "unidades_xl"
    }

    if talla not in columnas_talle:

        return jsonify({
            "error": "Seleccioná un talle válido"
        }), 400


    db = conectar_db()


    producto = db.execute(
        """
        SELECT *
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


    columna_talle = columnas_talle[talla]

    try:
        unidades_talle = int(float(producto[columna_talle] or 0))
    except (TypeError, ValueError):
        db.close()

        return jsonify({
            "error": f"El stock del talle {talla} no es un número válido"
        }), 400

    if unidades_talle <= 0:

        db.close()

        return jsonify({
            "error": "No hay unidades disponibles"
        }), 400


    try:
        db.execute(
            f"""
            UPDATE productos
            SET {columna_talle} = COALESCE({columna_talle}, 0) - 1
            WHERE id_producto = ?
            """,
            (id_producto,)
        )

        db.commit()

    except sqlite3.Error as error:
        db.rollback()
        db.close()

        return jsonify({
            "error": f"No se pudo actualizar el stock: {error}"
        }), 500

    db.close()


    return jsonify({
        "mensaje": "Compra realizada correctamente",
        "talla": talla
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