const supabase = require("../config/supabase");


async function testTrackProduct() {

    try {

        const product = {

            store_product_id: "2910",

            product_name:
                "Saffrix Spin Bike Arc",

            product_url:
                "https://demo.inelabteamdev.com/item/2910",

            selected_option:
                "Regular",

            active: true

        };


        const {
            data,
            error
        } = await supabase
            .from("tracked_products")
            .upsert(
                product,
                {
                    onConflict:
                        "store_product_id,selected_option"
                }
            )
            .select()
            .single();


        if (error) {
            throw error;
        }


        console.log(
            "\nPRODUCT SAVED:"
        );

        console.log(
            JSON.stringify(
                data,
                null,
                2
            )
        );

    }

    catch (error) {

        console.error(
            "\nFAILED TO SAVE PRODUCT:"
        );

        console.error(
            error
        );

    }

}


testTrackProduct();