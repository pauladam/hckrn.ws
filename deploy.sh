#!/bin/bash

git ci -am 'latest'
git push origin master
ssh hn 'cd /home/paul/web/hckrnws && git pull origin master'
