const funcion = document.getElementById("funcion");
const confirmar = document.getElementById("confirmar");
const contenido = document.getElementById("contenido");



confirmar.addEventListener("click", Funcion);


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




function Crear() {

    contenido.innerHTML = `

        <h2>Crear producto</h2>

        <form id="formCrear">

            <label>
                Precio:
                <input type="number" id="precioCrear" required>
            </label>

            <br><br>

            <label>
                Unidades disponibles:
                <input 
                    type="number" 
                    id="unidadesCrear" 
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

            <button type="submit">
                Crear producto
            </button>

        </form>
    `;


    document
        .getElementById("formCrear")
        .addEventListener("submit", crearProducto);

}



async function crearProducto(event) {

    event.preventDefault();


    const precio =
        document.getElementById("precioCrear").value;

    const unidades_disponibles =
        document.getElementById("unidadesCrear").value;

    const descripcion =
        document.getElementById("descripcionCrear").value;


    const respuesta = await fetch("/api/productos", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({

            precio: precio,

            unidades_disponibles: unidades_disponibles,

            descripcion: descripcion

        })

    });


    const datos = await respuesta.json();


    if (respuesta.ok) {

        alert("Producto creado correctamente");

        document.getElementById("formCrear").reset();

    }

    else {

        alert(datos.error);

    }

}




async function Leer() {

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

                </tr>

            </thead>

            <tbody>

    `;


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

            </tr>

        `;

    });


    html += `

            </tbody>

        </table>

    `;


    contenido.innerHTML = html;

}





function Actualizar() {

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
                    required
                >

            </label>

            <br><br>


            <label>

                Nuevas unidades disponibles:

                <input 
                    type="number" 
                    id="unidadesActualizar" 
                    required
                >

            </label>

            <br><br>


            <label>

                Nueva descripción:

                <input 
                    type="text" 
                    id="descripcionActualizar" 
                    required
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

    event.preventDefault();


    const id_producto =
        document.getElementById("idActualizar").value;

    const precio =
        document.getElementById("precioActualizar").value;

    const unidades_disponibles =
        document.getElementById("unidadesActualizar").value;

    const descripcion =
        document.getElementById("descripcionActualizar").value;


    const respuesta = await fetch(
            "/api/productos",
            {
                method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                id_producto: id_producto,

                precio: precio,

                unidades_disponibles:
                    unidades_disponibles,

                descripcion: descripcion

            })

        }
    );


    const datos =
        await respuesta.json();


    if (respuesta.ok) {

        alert(
            "Producto actualizado correctamente"
        );

    }

    else {

        alert(datos.error);

    }

}




function Borrar() {

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

    event.preventDefault();

    const id_producto =
        document.getElementById("idBorrar").value;


    const respuesta = await fetch(
        "/api/productos",
        {
            method: "DELETE",

            headers: {
                "Content-Type": "application/json"
            },

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

        document.getElementById("formBorrar").reset();

    } else {

        alert(datos.error);

    }

}