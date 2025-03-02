#!/bin/bash

# Check if the current branch is 'main'
current_branch=$(git rev-parse --abbrev-ref HEAD)


# if the branch is not main, then exit
if [ "$current_branch" != "main" ]; then
    echo "Current branch is not main. Exiting."
    exit 1
fi

# then find compress the extension
zip -r extension.zip extension
