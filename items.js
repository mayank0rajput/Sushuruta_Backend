import { menuItems } from "./controller.js";

export const items = async (req,res) => {
    res.status(200).json({menuItems});
}