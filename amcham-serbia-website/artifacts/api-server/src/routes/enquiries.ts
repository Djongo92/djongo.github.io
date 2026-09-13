import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, enquiriesTable } from "@workspace/db";
import {
  CreateEnquiryBody,
  CreateEnquiryResponse,
  ListEnquiriesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/enquiries", async (req, res): Promise<void> => {
  const parsed = CreateEnquiryBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid enquiry payload");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [enquiry] = await db
    .insert(enquiriesTable)
    .values(parsed.data)
    .returning();

  req.log.info({ enquiryId: enquiry.id }, "Membership enquiry received");
  res.status(201).json(CreateEnquiryResponse.parse(enquiry));
});

router.get("/enquiries", async (_req, res): Promise<void> => {
  const enquiries = await db
    .select()
    .from(enquiriesTable)
    .orderBy(desc(enquiriesTable.createdAt));

  res.json(ListEnquiriesResponse.parse(enquiries));
});

export default router;
