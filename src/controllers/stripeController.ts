import { Request, Response } from "express";

import { STRIPE_SECRET_KEY } from "../constants/env";
import { updateOrderInDatabase } from "./orderController";
import { updateProductStock } from "./productController";
const stripe = require("stripe")(STRIPE_SECRET_KEY);

export const checkoutSessionEmbedded = async (req: Request, res: Response) => {
  const { cart, orderId } = req.body;

  const lineItems = cart.map((item) => {
    return {
      price_data: {
        currency: "sek",
        product_data: {
          name: item.product.name,
          images: [item.product.image],
        },
        unit_amount: item.product.price * 100,
      },
      adjustable_quantity: {
        enabled: true,
        minimum: 1,
        maximum: 10,
      },

      quantity: item.count,
    };
  });

  const session = await stripe.checkout.sessions.create({
    line_items: lineItems,
    mode: "payment",
    ui_mode: "embedded",
    return_url:
      // "http://localhost:5173/order-confirmation/{CHECKOUT_SESSION_ID}",
      "https://new-ecommerce-client.vercel.app/order-confirmation/{CHECKOUT_SESSION_ID}",
    client_reference_id: orderId,
  });

  res.send({ clientSecret: session.client_secret });
};

export const webhook = async (req: Request, res: Response) => {
  const event = req.body;

  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object;
      const lineItems = await stripe.checkout.sessions.listLineItems(
        session.id
      );

      console.log(event);
      console.log(lineItems);

      const orderId = session.client_reference_id;
      const paymentId = session.id;
      const paymentStatus = "Paid";
      const orderStatus = "Received";

      try {
        await updateOrderInDatabase(
          orderId,
          paymentStatus,
          paymentId,
          orderStatus
        );

        for (const item of lineItems.data) {
          const productName = item.description;
          const quantity = item.quantity;

          try {
            await updateProductStock(productName, quantity);
            console.log(`Stock updated successfully for ${productName}`);
          } catch (error) {
            console.error(`Failed to update stock for ${productName}:`, error);
          }
        }
      } catch (error) {
        console.error("Error updating order:", error);
      }

      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};
