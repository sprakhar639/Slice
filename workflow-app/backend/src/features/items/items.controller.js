import { z } from "zod";
import * as service from "./items.service.js";
import { createSchema, listSchema, patchSchema } from "./items.schema.js";

const idParam = (req) => z.coerce.number().int().parse(req.params.id);

export const create = async (req, res) => res.status(201).json(await service.createItem(req.userId, createSchema.parse(req.body)));
export const list = async (req, res) => res.json(await service.listItems(req.userId, listSchema.parse(req.query)));
export const get = async (req, res) => res.json(await service.getItem(req.userId, idParam(req)));
export const update = async (req, res) =>
  res.json(await service.updateItem(req.userId, idParam(req), patchSchema.parse(req.body)));
