


async function cargarProductos() {

    const respuesta = await fetch("/api/productos-tienda");

    const productos = await respuesta.json();


    if (!respuesta.ok) {

        alert(productos.error);

        return;

    }


    const contenedor =
        document.getElementById("productos");


    let html = "";


    productos.forEach(producto => {

        html += `

            <article>

                <img
                    class="imagen-producto"
                    src="/static/img/productos/${producto.imagen}"
                    alt="${producto.descripcion}"
                >

                <h1>
                    ${producto.descripcion}
                </h1>

                <h2>
                    Precio: $${producto.precio}
                </h2>

                <p>
                    Unidades disponibles:
                    ${producto.unidades_disponibles}
                </p>

                <button onclick="comprar(${producto.id_producto})">
                    Comprar
                </button>

            </article>

        `;

    });


    contenedor.innerHTML = html;

}

async function comprar(id_producto) {

    const respuesta = await fetch("/api/comprar", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            id_producto: id_producto
        })

    });


    const datos = await respuesta.json();


    if (respuesta.status === 401) {

        alert("Tenés que iniciar sesión para comprar.");

        window.location.href = "/login";

        return;

    }


    if (respuesta.ok) {

        alert("¡Compra realizada correctamente!");

        cargarProductos();

    } else {

        alert(datos.error);

    }

}


cargarProductos();

