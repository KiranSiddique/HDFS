# HDFS
# Hadoop HDFS Live Dashboard

A modern browser-based Hadoop HDFS Dashboard built using Node.js, WebHDFS REST API, HTML, CSS, and JavaScript. This project provides a graphical interface for monitoring HDFS operations, managing files, checking replication status, viewing cluster performance, and simulating MapReduce jobs without relying completely on terminal commands.

---

## 🚀 Features

* 📁 Upload files directly to HDFS
* 🗂 Browse real HDFS directories and files
* 🔄 Monitor HDFS block replication
* ⚙️ Simulate MapReduce Word Count jobs
* 📊 View live Hadoop cluster statistics
* 📝 Generate project reports
* 🌐 Real-time dashboard interface
* 🔌 Node.js proxy server for WebHDFS API communication
* 🧩 Responsive and interactive UI

---

## 🛠 Technologies Used

* Node.js
* Hadoop HDFS 3.3.6
* WebHDFS REST API
* HTML5
* CSS3
* JavaScript (Vanilla JS)
* Ubuntu Linux

---

## 🏗 System Architecture

The dashboard uses a Node.js backend proxy server to communicate with the Hadoop WebHDFS API. This resolves browser CORS restrictions and allows secure communication between the frontend and the Hadoop cluster.

```text
Browser UI  →  Node.js Proxy Server  →  WebHDFS API  →  Hadoop Cluster
```

---

## 📂 Project Structure

```bash
project-folder/
│
├── server.js          # Backend proxy server
├── index.html         # Frontend dashboard UI
├── package.json
└── README.md
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone Repository

```bash
git clone <your-github-repo-link>
cd hdfs-dashboard
```

---

### 2️⃣ Install Node.js Dependencies

```bash
npm install
```

---

### 3️⃣ Start Hadoop Services

```bash
start-dfs.sh
start-yarn.sh
jps
```

---

### 4️⃣ Run Node.js Proxy Server

```bash
node server.js
```

---

### 5️⃣ Open Dashboard

Open in browser:

```text
http://localhost:3000
```

---

## 📊 Dashboard Modules

### 📁 Upload Dataset

Upload datasets directly into HDFS with configurable replication factor.

### 🗂 Browse HDFS

Navigate directories, check file permissions, sizes, owners, and modification timestamps.

### 🔄 Replication Monitor

Check real-time HDFS block replication status and DataNode health.

### ⚙️ MapReduce Simulation

Visualize the MapReduce pipeline and Word Count workflow.

### 📊 Performance Metrics

Monitor:

* Total Capacity
* Used Space
* Free Space
* Live DataNodes
* Total Blocks
* Throughput Statistics

### 📝 Report Generator

Generate downloadable project summaries and reports.

---

## 🔍 Key Learning Outcomes

* Understanding Hadoop Distributed File System (HDFS)
* WebHDFS API integration
* Distributed storage concepts
* Block replication mechanisms
* Hadoop cluster monitoring
* MapReduce workflow visualization
* Backend proxy server implementation
* Real-time dashboard development

---

## 📸 Project Demonstrations

The dashboard successfully demonstrated:

* HDFS file browsing
* Replication monitoring
* MapReduce output visualization
* Live cluster statistics
* Performance evaluation metrics

---

## 📚 Academic Context

This project was developed as part of a Parallel and Distributed Computing / Big Data Systems lab project to demonstrate practical implementation of Hadoop Distributed File System concepts and real-time monitoring interfaces.

---

## 👩‍💻 Developer

**Kiran Siddique**
BS Computer Science
Hadoop HDFS Dashboard Project

---

## 📄 License

This project is developed for educational and learning purposes.
