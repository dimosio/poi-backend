import express from "express";
import bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.set("port", process.env.PORT || 3000);
app.use(cors());
app.use(bodyParser.json());

app.get("/", (_req: any, res: any) => {
  res.send(200);
});

app.listen(app.get("port"), () => {
  console.log(`🚀 Server ready at http://localhost:${app.get("port")}`);
});

export default app;
