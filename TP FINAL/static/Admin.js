// -----------------------------------------------------------
// Estado inicial del panel administrativo
// -----------------------------------------------------------
// Se almacenan las referencias principales del DOM para leer la opción
// elegida por el admin y actualizar el contenido según la operación.
const funcion = document.getElementById("funcion");
const confirmar = document.getElementById("confirmar");
const contenido = document.getElementById("contenido");

// Patrón orientado a eventos: la acción se ejecuta cuando el usuario hace clic.
confirmar.addEventListener("click", Funcion);

// -----------------------------------------------------------
// Selección de la operación CRUD
// -----------------------------------------------------------
// Esta función decide qué formulario o lectura mostrar según la opción
// elegida por el administrador.
function Funcion() {

    const seleccion = funcion.value;

    if (seleccion === "Crear") {

        Crear();

    }

    else if (seleccion === "Leer") {

        Leer();

    }

    else if (seleccion === "Actualizar") {

        Actualizar();

    }

    else if (seleccion === "Borrar") {

        Borrar();

    }

    else {

        contenido.innerHTML = "<p>Elegí una función.</p>";

    }

}

// -----------------------------------------------------------
// Crear producto
// -----------------------------------------------------------
// Genera el formulario para crear un producto y lo envía por fetch.
function Crear() {

    // Se genera el formulario solo cuando se necesita: actualización dinámica del DOM.
    contenido.innerHTML = `

        <h2>Crear producto</h2>

        <form id="formCrear">

            <label>

                Precio:

                <input 
                    type="number" 
                    id="precioCrear" 
                    required
                >

            </label>

            <br><br>

            <label>

                Descripción:

                <input 
                    type="text" 
                    id="descripcionCrear" 
                    required
                >

            </label>

            <br><br>

            <label>

                Descripción completa:

                <textarea id="descripcionCompletaCrear" required></textarea>

            </label>

            <br><br>

            <label>
                Categoría:
                <input type="text" id="categoriaCrear" required>
            </label>

            <br><br>

            <label>
                Unidades talle S:
                <input type="number" id="unidadesSCrear" min="0" required>
            </label>

            <br><br>

            <label>
                Unidades talle M:
                <input type="number" id="unidadesMCrear" min="0" required>
            </label>

            <br><br>

            <label>
                Unidades talle L:
                <input type="number" id="unidadesLCrear" min="0" required>
            </label>

            <br><br>

            <label>
                Unidades talle XL:
                <input type="number" id="unidadesXLCrear" min="0" required>
            </label>

            <br><br>

            <label>

                Imagen:

                <input 
                    type="file" 
                    id="imagenCrear"
                    accept="image/png, image/jpeg, image/webp"
                    required
                >

            </label>

            <br><br>

            <button type="submit">

                Crear producto

            </button>

        </form>

    `;

    // El submit se intercepta para enviar los datos con JavaScript sin recargar la página.
    document
        .getElementById("formCrear")
        .addEventListener(
            "submit",
            crearProducto
        );

}

async function crearProducto(event) {

    // Evita el envío HTML tradicional y permite controlar la petición con fetch.
    event.preventDefault();

    const precio =
        document.getElementById("precioCrear").value;

    const descripcion =
        document.getElementById("descripcionCrear").value;

    const descripcion_completa =
        document.getElementById("descripcionCompletaCrear").value;

    const categoria =
        document.getElementById("categoriaCrear").value;

    const unidades_s =
        document.getElementById("unidadesSCrear").value;

    const unidades_m =
        document.getElementById("unidadesMCrear").value;

    const unidades_l =
        document.getElementById("unidadesLCrear").value;

    const unidades_xl =
        document.getElementById("unidadesXLCrear").value;

    const imagen =
        document.getElementById("imagenCrear").files[0];

    // FormData representa pares clave-valor y permite enviar archivos multipart/form-data.
    const datosFormulario = new FormData();

    datosFormulario.append(
        "precio",
        precio
    );

    datosFormulario.append(
        "descripcion",
        descripcion
    );

    datosFormulario.append("descripcion_completa", descripcion_completa);
    datosFormulario.append("categoria", categoria);
    datosFormulario.append("unidades_s", unidades_s);
    datosFormulario.append("unidades_m", unidades_m);
    datosFormulario.append("unidades_l", unidades_l);
    datosFormulario.append("unidades_xl", unidades_xl);

    datosFormulario.append(
        "imagen",
        imagen
    );

    // async/await coordina una operación asíncrona de red de forma secuencial y legible.
    const respuesta = await fetch(
        "/api/productos",
        {
            method: "POST",
            body: datosFormulario
        }
    );

    const datos =
        await respuesta.json();

    // respuesta.ok distingue respuestas HTTP exitosas de errores del servidor.
    if (respuesta.ok) {

        alert(
            "Producto creado correctamente"
        );

        document
            .getElementById("formCrear")
            .reset();

        Leer();

    }

    else {

        alert(datos.error);

    }

}

// -----------------------------------------------------------
// Leer productos
// -----------------------------------------------------------
// Solicita la lista completa de productos y la dibuja en una tabla.
async function Leer() {

    // READ: solicita la colección de productos y la muestra en una tabla.
    const respuesta =
        await fetch("/api/productos");

    const productos =
        await respuesta.json();

    if (!respuesta.ok) {

        alert(productos.error);

        return;

    }

    let html = `

        <h2>Productos</h2>

        <table border="1">

            <thead>

                <tr>

                    <th>ID Producto</th>

                    <th>Precio</th>

                    <th>Unidades disponibles</th>

                    <th>Descripción</th>

                    <th>Descripción completa</th>

                    <th>Stock S</th>

                    <th>Stock M</th>

                    <th>Stock L</th>

                    <th>Stock XL</th>

                    <th>Imagen</th>

                </tr>

            </thead>

            <tbody>

    `;

    // forEach recorre la colección y construye una fila por cada registro.
    productos.forEach(producto => {

        html += `

            <tr>

                <td>
                    ${producto.id_producto}
                </td>

                <td>
                    ${producto.precio}
                </td>

                <td>
                    ${producto.unidades_disponibles}
                </td>

                <td>
                    ${producto.descripcion}
                </td>

                <td>
                    ${producto.descripcion_completa}
                </td>

                <td>${producto.unidades_s}</td>

                <td>${producto.unidades_m}</td>

                <td>${producto.unidades_l}</td>

                <td>${producto.unidades_xl}</td>

                <td>

                    <img 
                        src="/static/img/productos/${producto.imagen}"
                        width="100"
                    >

                </td>

            </tr>

        `;

    });

    html += `

            </tbody>

        </table>

    `;

    contenido.innerHTML = html;

}

// -----------------------------------------------------------
// Actualizar producto
// -----------------------------------------------------------
// Muestra el formulario de edición y envía solo los campos relevantes.
function Actualizar() {

    // Se construye un formulario donde solo los campos informados serán modificados.
    contenido.innerHTML = `

        <h2>Actualizar producto</h2>

        <form id="formActualizar">

            <label>

                ID del producto:

                <input 
                    type="number" 
                    id="idActualizar" 
                    required
                >

            </label>

            <br><br>

            <label>

                Nuevo precio:

                <input 
                    type="number" 
                    id="precioActualizar"
                >

            </label>

            <br><br>

            <label>
                Categoría:
                <input type="text" id="categoriaActualizar" required>
            </label>

            <br><br>

            <label>

                Nueva descripción:

                <input 
                    type="text" 
                    id="descripcionActualizar"
                >

            </label>

            <br><br>

            <label>

                Nueva descripción completa:

                <textarea id="descripcionCompletaActualizar"></textarea>

            </label>

            <br><br>

            <label>
                Nuevas unidades talle S:
                <input type="number" id="unidadesSActualizar" min="0">
            </label>

            <br><br>

            <label>
                Nuevas unidades talle M:
                <input type="number" id="unidadesMActualizar" min="0">
            </label>

            <br><br>

            <label>
                Nuevas unidades talle L:
                <input type="number" id="unidadesLActualizar" min="0">
            </label>

            <br><br>

            <label>
                Nuevas unidades talle XL:
                <input type="number" id="unidadesXLActualizar" min="0">
            </label>

            <br><br>

            <label>

                Nueva imagen:

                <input 
                    type="file" 
                    id="imagenActualizar"
                    accept="image/png, image/jpeg, image/webp"
                >

            </label>

            <br><br>

            <button type="submit">

                Actualizar producto

            </button>

        </form>

    `;

    document
        .getElementById("formActualizar")
        .addEventListener(
            "submit",
            actualizarProducto
        );

}

async function actualizarProducto(event) {

    // UPDATE: envía el identificador y los nuevos valores al servidor.
    event.preventDefault();

    const id_producto =
        document.getElementById("idActualizar").value;

    const precio =
        document.getElementById("precioActualizar").value;

    const descripcion =
        document.getElementById("descripcionActualizar").value;

    const descripcion_completa =
        document.getElementById("descripcionCompletaActualizar").value;

    const categoria =
        document.getElementById("categoriaActualizar").value;

    const unidades_s =
        document.getElementById("unidadesSActualizar").value;

    const unidades_m =
        document.getElementById("unidadesMActualizar").value;

    const unidades_l =
        document.getElementById("unidadesLActualizar").value;

    const unidades_xl =
        document.getElementById("unidadesXLActualizar").value;

    const imagen =
        document.getElementById("imagenActualizar").files[0];

    const datosFormulario = new FormData();

    datosFormulario.append(
        "id_producto",
        id_producto
    );

    datosFormulario.append(
        "precio",
        precio
    );

    datosFormulario.append(
        "descripcion",
        descripcion
    );

    datosFormulario.append("descripcion_completa", descripcion_completa);
    datosFormulario.append("categoria", categoria);
    datosFormulario.append("unidades_s", unidades_s);
    datosFormulario.append("unidades_m", unidades_m);
    datosFormulario.append("unidades_l", unidades_l);
    datosFormulario.append("unidades_xl", unidades_xl);

    // La imagen es opcional en una actualización; se conserva la anterior si no hay nueva.
    if (imagen) {

        datosFormulario.append(
            "imagen",
            imagen
        );

    }

    const respuesta = await fetch(
        "/api/productos",
        {
            method: "PUT",

            body: datosFormulario

        }
    );

    const datos =
        await respuesta.json();

    if (respuesta.ok) {

        alert(
            "Producto actualizado correctamente"
        );

        Leer();

    }

    else {

        alert(datos.error);

    }

}

// -----------------------------------------------------------
// Borrar producto
// -----------------------------------------------------------
// Requiere el id del producto y elimina la fila de la base de datos.
function Borrar() {

    // Se solicita únicamente el identificador porque DELETE necesita localizar un registro.
    contenido.innerHTML = `

        <h2>Borrar producto</h2>

        <form id="formBorrar">

            <label>

                ID del producto:

                <input 
                    type="number" 
                    id="idBorrar" 
                    required
                >

            </label>

            <br><br>

            <button type="submit">

                Borrar producto

            </button>

        </form>

    `;

    document
        .getElementById("formBorrar")
        .addEventListener(
            "submit",
            borrarProducto
        );

}

async function borrarProducto(event) {

    // DELETE: elimina el producto identificado mediante una petición JSON.
    event.preventDefault();

    const id_producto =
        document.getElementById("idBorrar").value;

    const respuesta = await fetch(
        "/api/productos",
        {
            method: "DELETE",

            // El encabezado informa al servidor que el cuerpo contiene JSON.
            headers: {
                "Content-Type": "application/json"
            },

            // JSON.stringify serializa el objeto JavaScript para transportarlo por HTTP.
            body: JSON.stringify({

                id_producto: id_producto

            })

        }
    );

    const datos =
        await respuesta.json();

    if (respuesta.ok) {

        alert(
            "Producto eliminado correctamente"
        );

        document
            .getElementById("formBorrar")
            .reset();

        Leer();

    }

    else {

        alert(datos.error);

    }

}