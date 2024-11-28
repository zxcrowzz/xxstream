const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  vendorId: { type: String, required: true },
  payerName: { type: String, required: true },
  payerEmail: { type: String, required: true },
  orderId: { type: String, required: true },
  shippingAddress: {
    address_line_1: { type: String, required: true },
    address_line_2: { type: String, required: false },
    admin_area_2: { type: String, required: true },
    admin_area_1: { type: String, required: true },
    postal_code: { type: String, required: true },
    country_code: { type: String, required: true }
  }
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
