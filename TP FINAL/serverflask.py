from flask import Flask, jsonify, request, render_template, url_for, session
import sqlite3
app = Flask(__name__)
app.secret_key = "una_clave_secreta"
base_de_datos = []
contador_id = 1

def conectar_db():
    db = sqlite3.connect("tienda.db")
    db.row_factory = sqlite3.Row
    return db

@app.route('/')
def bienvenida():
    return render_template('bienvenida.html')


@app.route('/index')
def index():
    return render_template('tienda.html')    

@app.route('/indexlogin')
def indexlogin():
    return render_template('tiendasinlogin.html')

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
        "SELECT * FROM usuarios WHERE usuario = ?",
        (usuario,)
    ).fetchone()

    if usuario_existente:
        db.close()
        return jsonify({
            "error": "El usuario ya existe"
        }), 400

    db.execute(
        """
        INSERT INTO usuarios (usuario, contraseña, rol)
        VALUES (?, ?, ?)
        """,
        (usuario, contraseña, "cliente")
    )

    db.commit()
    db.close()

    return jsonify({
        "mensaje": "Usuario registrado correctamente"
    }), 201
@app.route("/admin")
def admin():
    if session.get("rol") != "admin":
        return "No autorizado", 403
    return render_template('admin.html')

@app.route("/api/productos", methods=["GET", "POST", "PUT", "DELETE"])
def productos():

    if session.get("rol") != "admin":
        return jsonify({
            "error": "No autorizado"
        }), 403

    db = conectar_db()

    if request.method == "GET":

        resultado = db.execute("""
            SELECT id_producto, precio, unidades_disponibles, descripcion
            FROM productos
        """).fetchall()

        db.close()

        return jsonify([dict(producto) for producto in resultado])

    elif request.method == "POST":

        datos = request.get_json()

        precio = datos["precio"]
        unidades = datos["unidades_disponibles"]
        descripcion = datos["descripcion"]

        print(datos)
        print(precio)
        print(unidades)
        print(descripcion)

        
        db.execute("""
            INSERT INTO productos
            (precio, unidades_disponibles, descripcion)
            VALUES (?, ?, ?)
        """, (precio, unidades, descripcion))

        db.commit()
        db.close()

        return jsonify({
            "mensaje": "Producto creado correctamente"
        }), 201

    elif request.method == "PUT":

        datos = request.get_json()

        id_producto = datos["id_producto"]
        precio = datos["precio"]
        unidades = datos["unidades_disponibles"]
        descripcion = datos["descripcion"]

        resultado = db.execute("""
            UPDATE productos
            SET precio = ?,
                unidades_disponibles = ?,
                descripcion = ?
            WHERE id_producto = ?
        """, (
            precio,
            unidades,
            descripcion,
            id_producto
        ))

        db.commit()
        db.close()

        if resultado.rowcount == 0:
            return jsonify({
                "error": "Producto no encontrado"
            }), 404

        return jsonify({
            "mensaje": "Producto actualizado correctamente"
        })

    elif request.method == "DELETE":

        datos = request.get_json()

        id_producto = datos["id_producto"]

        resultado = db.execute("""
            DELETE FROM productos
            WHERE id_producto = ?
        """, (id_producto,))

        db.commit()
        db.close()

        if resultado.rowcount == 0:
            return jsonify({
                "error": "Producto no encontrado"
            }), 404

        return jsonify({
            "mensaje": "Producto eliminado correctamente"
        })

@app.route("/api/productos-tienda", methods=["GET"])
def productos_tienda():

    db = conectar_db()

    resultado = db.execute("""
        SELECT id_producto, precio, unidades_disponibles, descripcion
        FROM productos
    """).fetchall()

    db.close()

    return jsonify([
        dict(producto)
        for producto in resultado
    ])

@app.route("/api/comprar", methods=["POST"])
def comprar():
    if "usuario" not in session:
        return jsonify({"error": "Tenés que iniciar sesión para comprar"}), 401
    datos = request.get_json()

    id_producto = datos["id_producto"]

    db = conectar_db()

    producto = db.execute("""
        SELECT *
        FROM productos
        WHERE id_producto = ?
    """, (id_producto,)).fetchone()

    if producto is None:

        db.close()

        return jsonify({
            "error": "Producto no encontrado"
        }), 404


    if producto["unidades_disponibles"] <= 0:

        db.close()

        return jsonify({
            "error": "No hay unidades disponibles"
        }), 400


    db.execute("""
        UPDATE productos
        SET unidades_disponibles = unidades_disponibles - 1
        WHERE id_producto = ?
    """, (id_producto,))


    db.commit()
    db.close()


    return jsonify({
        "mensaje": "Compra realizada correctamente"
    }), 200

if __name__ == '__main__':
    app.run(debug=True)
