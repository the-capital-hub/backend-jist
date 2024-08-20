import axios from "axios";
import { UserModel } from "../models/User.js";
import { Cashfree } from "cashfree-pg";
import crypto from "crypto";
import { response } from "express";

Cashfree.XClientId = process.env.CASHFREE_CLIENT_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = Cashfree.Environment.PRODUCTION;
const generateSubscriptionId = () => {
  // Create a base unique ID using the current timestamp
  const timestamp = Date.now().toString(36); // Convert timestamp to base36
  // Append a random string for additional uniqueness
  const randomStr = crypto.randomBytes(4).toString("hex"); // Generate a 4-byte random string in hex

  return `sub_${timestamp}_${randomStr}`;
};

export const create_subscription = async (req, res) => {
  try {
    const user = await UserModel.findOne({ _id: req.userId });
    if (req.body.subscriptionType === "Basic") {
      if (user.trialStartDate) {
        return res.status(400).json({ message: "Trial already taken" });
      } else {
        const currentDate = new Date();
        await UserModel.findOneAndUpdate(
          { _id: req.userId },
          { trialStartDate: currentDate, subscriptionType: "Basic" }
        );
        return res.status(200).json({ message: "Trial started" });
      }
    } else {

    const subscriptionId = generateSubscriptionId();
    let request = {
      order_amount: 1,
      order_currency: "INR",
      order_id: subscriptionId,
      customer_details: {
        customer_id: user._id,
        customer_phone: user.phoneNumber,
        customer_name: `${user.firstName} ${user.lastName}`,
        customer_email: user.email,
      },
      order_meta: {
        return_url: `${process.env.BASE_URL}payment/success?order_id=${subscriptionId}`,
      },
    };
    Cashfree.PGCreateOrder("2023-08-01", request)
      .then(async (response) => {
        await UserModel.findOneAndUpdate(
          { _id: req.userId },
          {
            subReferenceId: response.data.order_id,
            subscriptionType: req.body.subscriptionType,
          }
        );
        return res.status(200).send(response.data);
      })
      .catch((error) => {
        console.log(error.response.data.message);
      });
     }
    // const option = {
    //   method: "POST",
    //   url: "https://test.cashfree.com/api/v2/subscriptions/nonSeamless/subscription",
    //   headers: {
    //     "Content-Type": "application/json",
    //     "X-Client-Id": "TEST10211515d43abdea8db499a89c9d51511201",
    //     "X-Client-Secret":
    //       "cfsk_ma_test_764b3a3bb7e29eaab77e72b294c0d4f1_5fd51d2e",
    //   },
    //   data: {
    //     subscriptionId: subscriptionId,
    //     planId:"Standard",
    //     customerName: `${user.firstName} ${user.lastName}`,
    //     customerPhone: user.phoneNumber,
    //     customerEmail: user.email,
    //     returnUrl: `http://localhost:3000/payment/success?order_id=${subscriptionId}`,
    //     //notify_url:`${process.env.BASE_URL}/payment/success`,
    //     authAmount: req.body.price,
    //     expiresOn: expiresDate,
    //     notes: result,
    //     planInfo: {
    //       type: "ON_DEMAND",
    //       planName: "abcede",
    //       maxAmount: 30000,
    //       maxCycles: 10,
    //       linkExpiry: 5,
    //     },
    //     notificationChannels: ["EMAIL", "SMS"],
    //   },
    // };
    // await axios
    //   .request(option)
    //   .then(async (response) => {
    //     await UserModel.findOneAndUpdate(
    //       { _id: req.userId },
    //       {
    //         subReferenceId: response.data.data.subReferenceId,
    //         subscriptionType:req.body.subscriptionType
    //       }
    //     );
    //     console.log(response.data)
    //     return res.status(200).send(response.data);
    //   })
    //   .catch((err) => {
    //     console.log(err);
    //     return res.status(500).send(err);
    //   });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err.message);
  }
};

export const update_plan_status = async (req, res) => {
  try {
    const userData = await UserModel.findOne({ _id: req.userId });
    const option = {
      method: "GET",
      url: `https://test.cashfree.com/api/v2/subscriptions/${userData.subReferenceId}`,
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": "TEST10211515d43abdea8db499a89c9d51511201",
        "X-Client-Secret":
          "cfsk_ma_test_764b3a3bb7e29eaab77e72b294c0d4f1_5fd51d2e",
      },
    };
    await axios
      .request(option)
      .then(async (response) => {
        console.log(response.data);
        if (response.data.status === "SUCCESS")
          await UserModel.findOneAndUpdate(
            { _id: req.userId },
            { isSubscribed: true }
          );
        return res.status(200).send(response.data);
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).send(err);
      });
  } catch (err) {
    return res.status(500).send(err.message);
  }
};

export const get_subscription_plan = async (req, res) => {
  try {
    const order_id = req.body.orderId;
    Cashfree.PGOrderFetchPayments("2023-08-01", order_id)
      .then(async (response) => {
        if (response.data[0].payment_status === "SUCCESS") {
          await UserModel.findOneAndUpdate(
            { _id: req.userId },
            { isSubscribed: true }
          );
        }
        const user = await UserModel.findOne({_id:req.userId})
        console.log(response.data);
        return res.status(200).send({paymentData:response.data[0],user});
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).send(err);
      });
    // const option = {
    //   method: "GET",
    //   url: `https://test.cashfree.com/api/v2/subscriptions/${req.body.subReferenceId}`,
    //   headers: {
    //     "Content-Type": "application/json",
    //     "X-Client-Id": "TEST10211515d43abdea8db499a89c9d51511201",
    //     "X-Client-Secret":
    //       "cfsk_ma_test_764b3a3bb7e29eaab77e72b294c0d4f1_5fd51d2e",
    //   },
    // };
    // await axios
    //   .request(option)
    //   .then((response) => {
    //     console.log(response.data);
    //     return res.status(200).send(response.data);
    //   })
    //   .catch((err) => {
    //     console.log(err);
    //     return res.status(500).send(err);
    //   });
  } catch (err) {
    console.log(err.message);
    return res.status(500).send(err.message);
  }
};
