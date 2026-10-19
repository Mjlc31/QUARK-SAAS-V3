#!/bin/bash
echo "ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS assignee text,
  ADD COLUMN IF NOT EXISTS deadline date,
  ADD COLUMN IF NOT EXISTS completed boolean,
  ADD COLUMN IF NOT EXISTS priority text;" > migration.sql

echo "UPDATE public.tasks SET
  title = data->>'title', assignee = data->>'assignee', deadline = NULLIF(data->>'deadline', '')::date,
  completed = (data->>'completed')::boolean, priority = data->>'priority';" >> migration.sql
