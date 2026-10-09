# Admin JSON upload

Use the Upload button in the existing header. It opens a separate admin window and does not alter the normal exam UI.

Provide a complete Question JSON and Answer Key JSON. The uploader validates 1-150 default answers and required language-variant keys before saving.

### Save into the repository
**Chrome/Edge:** select the project root once, then use **Save Into Project**. The browser writes the dataset into `data/papers/<SET>/`, `data/answer_keys/<SET>/`, and `frontend/public/data/<SET>/`, and updates `catalog.json`.

**Firefox:** run `python processor/local_admin_server.py`, then use **Use Local Writer**.

After saving, commit and push to GitHub. The public website reads only the committed JSON from the repository; there is no SQL/application database.
