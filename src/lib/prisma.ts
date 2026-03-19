import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaTiDBCloud } from "@tidbcloud/prisma-adapter";

const adapter = new PrismaTiDBCloud({url: process.env.DATABASE_URL!});
const prisma = new PrismaClient({ adapter });
export {prisma}