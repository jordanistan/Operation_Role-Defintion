# Backup and Restore

## Scope

This guide covers local MVP runtime data only. It does not replace production backup, retention, deletion, encryption, or disaster recovery planning.

## Data Locations

Default local files:

- JSON store: `data/operations-assistant.json`
- SQLite store: `data/operations-assistant.sqlite`

Both are ignored by git.

## Backup JSON Data

```sh
mkdir -p backups
cp data/operations-assistant.json backups/operations-assistant-$(date +%Y%m%d-%H%M%S).json
```

If using a custom file:

```sh
cp "$DATA_FILE" backups/custom-json-backup.json
```

## Restore JSON Data

Stop the app first. Then copy the backup into place:

```sh
cp backups/operations-assistant-backup.json data/operations-assistant.json
```

Restart with the default JSON store:

```sh
ACCESS_KEY="replace-with-local-key" npm start
```

## Backup SQLite Data

Stop the app first. Then copy the database file:

```sh
mkdir -p backups
cp data/operations-assistant.sqlite backups/operations-assistant-$(date +%Y%m%d-%H%M%S).sqlite
```

## Restore SQLite Data

Stop the app first. Then copy the backup into place:

```sh
cp backups/operations-assistant-backup.sqlite data/operations-assistant.sqlite
```

Restart with SQLite:

```sh
STORE_TYPE=sqlite ACCESS_KEY="replace-with-local-key" npm start
```

## Security Notes

Backups may contain client operations data, staff names, vendor details, invoices notes, tasks, SOPs, workflows, and KPI history. Do not commit backups, upload them to shared folders, or send them externally without client approval.

Before production use, define encryption, retention, deletion, access control, and restore testing requirements.
