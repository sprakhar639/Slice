import { z } from "zod";
import * as service from "./comments.service.js";

const bodySchema = z.object({ body: z.string().min(1).max(2000) });

export const add = async (req, res) => {
  const id = z.coerce.number().int().parse(req.params.id);
  const { body } = bodySchema.parse(req.body);
  res.status(201).json(await service.addComment(req.userId, id, body));
};
