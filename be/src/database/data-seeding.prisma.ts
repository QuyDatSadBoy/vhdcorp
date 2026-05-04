import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  // Create example users
  for (let i = 0; i < 10; i++) {
    const random = Math.floor(Math.random() * 10);
    await prisma.user.create({
      data: {
        account: faker.internet.email(),
        username: faker.person.fullName(),
        type: random % 2 == 0 ? "facebook" : "google",
        avatar : "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ1zwhySGCEBxRRFYIcQgvOLOpRGqrT3d7Qng&s"
      }
    });
  }
  console.log("Seeding completed.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });