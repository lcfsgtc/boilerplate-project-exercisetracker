const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

// 内存中的数据存储 (非持久化)
const users = []; // 存储用户对象: { _id: string, username: string }
const exercises = []; // 存储锻炼对象: { _id: string, userId: string, description: string, duration: number, date: Date }
// 中间件
app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true })); // 用于解析 POST 请求的表单数据
app.use(express.json()); // 用于解析 JSON 请求体
// 根路由
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});
// 辅助函数：生成简单的唯一 ID
function generateId() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}
// 1. 创建新用户
// POST /api/users
app.post("/api/users", (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  // 检查用户名是否已存在
  const existingUser = users.find((u) => u.username === username);
  if (existingUser) {
    return res.status(409).json({ error: "Username already exists" });
  }

  const newUser = {
    _id: generateId(),
    username: username,
  };
  users.push(newUser);

  res.json(newUser);
});
// 2. 获取所有用户列表
// GET /api/users
app.get("/api/users", (req, res) => {
  // 返回用户对象，只包含 username 和 _id
  const userList = users.map((user) => ({
    username: user.username,
    _id: user._id,
  }));
  res.json(userList);
});
// 3. 为用户添加锻炼
// POST /api/users/:_id/exercises
app.post("/api/users/:_id/exercises", (req, res) => {
  const { _id } = req.params; // 用户 ID
  let { description, duration, date } = req.body;

  if (!description || !duration) {
    return res
      .status(400)
      .json({ error: "Description and duration are required" });
  }

  duration = parseInt(duration);
  if (isNaN(duration)) {
    return res.status(400).json({ error: "Duration must be a number" });
  }

  const user = users.find((u) => u._id === _id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  let exerciseDate;
  if (date) {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }
    exerciseDate = parsedDate;
  } else {
    exerciseDate = new Date(); // 如果没有提供日期，使用当前日期
  }

  const newExercise = {
    _id: generateId(), // 锻炼本身的ID
    userId: _id,
    description: description,
    duration: duration,
    date: exerciseDate,
  };
  exercises.push(newExercise);

  res.json({
    _id: user._id,
    username: user.username,
    date: newExercise.date.toDateString(), // 格式化日期
    duration: newExercise.duration,
    description: newExercise.description,
  });
});
// 4. 获取用户锻炼日志
// GET /api/users/:_id/logs?[from][&to][&limit]
app.get("/api/users/:_id/logs", (req, res) => {
  const { _id } = req.params; // 用户 ID
  const { from, to, limit } = req.query;

  const user = users.find((u) => u._id === _id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  let userExercises = exercises.filter((ex) => ex.userId === _id);

  // 过滤日期范围
  if (from) {
    const fromDate = new Date(from);
    // 设置为该天的开始，例如 2023-01-01 00:00:00.000 GMT
    fromDate.setUTCHours(0, 0, 0, 0);
    if (isNaN(fromDate.getTime())) {
      return res.status(400).json({ error: 'Invalid "from" date format' });
    }
    userExercises = userExercises.filter(
      (ex) => ex.date.getTime() >= fromDate.getTime(),
    );
  }
  if (to) {
    const toDate = new Date(to);
    // 设置为该天的结束，例如 2023-01-01 23:59:59.999 GMT
    toDate.setUTCHours(23, 59, 59, 999);
    if (isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Invalid "to" date format' });
    }
    userExercises = userExercises.filter(
      (ex) => ex.date.getTime() <= toDate.getTime(),
    );
  }
  // 按日期排序 (升序)
  userExercises.sort((a, b) => a.date.getTime() - b.date.getTime());
  // 限制日志数量
  let parsedLimit = parseInt(limit);
  if (limit && !isNaN(parsedLimit) && parsedLimit > 0) {
    userExercises = userExercises.slice(0, parsedLimit);
  } else if (limit && (isNaN(parsedLimit) || parsedLimit <= 0)) {
    return res.status(400).json({ error: "Limit must be a positive number" });
  }
  // 格式化日志
  const formattedLog = userExercises.map((ex) => ({
    description: ex.description,
    duration: ex.duration,
    date: ex.date.toDateString(), // 格式化日期
  }));

  res.json({
    _id: user._id,
    username: user.username,
    count: formattedLog.length,
    log: formattedLog,
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
