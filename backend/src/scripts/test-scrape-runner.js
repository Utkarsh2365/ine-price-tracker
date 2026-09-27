const supabase =
    require("../config/supabase");

const {
    scrapeTrackedProduct
} = require("../scraper/scrapeRunner");


async function test() {

    try {

        // --------------------------------
        // GET OUR TRACKED PRODUCT
        // --------------------------------

        const {
            data: product,
            error
        } = await supabase
            .from("tracked_products")
            .select("*")
            .eq(
                "store_product_id",
                "2910"
            )
            .eq(
                "selected_option",
                "Regular"
            )
            .single();


        if (error) {
            throw error;
        }


        console.log(
            "TRACKED PRODUCT FOUND:"
        );

        console.log(
            product.product_name,
            "-",
            product.selected_option
        );


        // --------------------------------
        // RUN SCRAPER + RETRIES
        // --------------------------------

        const result =
            await scrapeTrackedProduct(
                product
            );


        console.log(
            "\nFINAL RESULT:"
        );


        console.log(
            JSON.stringify(
                result,
                null,
                2
            )
        );

    }

    catch (error) {

        console.error(
            "\nTEST FAILED:"
        );

        console.error(
            error
        );

    }

}


test();