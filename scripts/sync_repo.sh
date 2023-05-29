#!/usr/bin/env sh

# 
# This script clones the data-officer repos or updates them if they already exist
# If something goes wrong it will do a fresh clone to catch it
# 

set -e

function nuke() {
  echo "sync: cleaning repo/ to try again"
  rm -rf *
}

function clone() {
  if [ -d ".git" ]
  then
    echo "sync: updating repo"
    git reset --hard
    git pull || nuke
  fi

  if [ ! -d ".git" ]
  then
    echo "sync: $1 into repo/"
    git clone "$1" .
  fi
}

if [ -z "$1" ]
then
  echo "<remote_url> not set"
  exit 1
fi

clone $1
