import express from "express";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Bayut-monitor is good to go" });
});

app.listen(3000, () => {
  console.log("app running on 3000");
});
