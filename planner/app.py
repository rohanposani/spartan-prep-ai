import os
import sys

# Ensure the app directory is on the path and is the working dir
APP_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, APP_DIR)

from flask import Flask, render_template, request, jsonify
from database import init_db, get_tasks, add_task, update_task, delete_task, get_journal, save_journal, get_month_summary
from datetime import date

app = Flask(__name__, instance_path=os.path.join(APP_DIR, "instance"))
init_db()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/tasks", methods=["GET"])
def api_get_tasks():
    target_date = request.args.get("date", date.today().isoformat())
    return jsonify(get_tasks(target_date))


@app.route("/api/tasks", methods=["POST"])
def api_add_task():
    data = request.json
    add_task(
        data["title"],
        data["due_time"],
        data.get("date", date.today().isoformat()),
        data.get("color", "#2d6a4f"),
    )
    return jsonify({"status": "ok"})


@app.route("/api/tasks/<int:task_id>", methods=["PATCH"])
def api_update_task(task_id):
    data = request.json
    update_task(task_id, **data)
    return jsonify({"status": "ok"})


@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
def api_delete_task(task_id):
    delete_task(task_id)
    return jsonify({"status": "ok"})


@app.route("/api/journal", methods=["GET"])
def api_get_journal():
    target_date = request.args.get("date", date.today().isoformat())
    return jsonify(get_journal(target_date))


@app.route("/api/month", methods=["GET"])
def api_month_summary():
    year = int(request.args.get("year", date.today().year))
    month = int(request.args.get("month", date.today().month))
    return jsonify(get_month_summary(year, month))


@app.route("/api/journal", methods=["POST"])
def api_save_journal():
    data = request.json
    save_journal(data.get("date", date.today().isoformat()), data["entry"])
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    import threading
    import webbrowser
    threading.Timer(1.5, lambda: webbrowser.open("http://127.0.0.1:5050")).start()
    app.run(host="127.0.0.1", port=5050, debug=False)
