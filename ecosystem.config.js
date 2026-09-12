module.exports = {
  apps: [
    {
      name: "ihass-backend",
      script: "server.js",
      cwd: "D:\\iqra-school-management-system\\backend"
    },
    {
      name: "ihass-frontend",
      script: "C:\\Windows\\System32\\cmd.exe",
      args: ["/c", "npm run dev"],
      cwd: "D:\\iqra-school-management-system\\frontend",
      interpreter: "none"
    }
  ]
}
