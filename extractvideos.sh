#!/bin/sh
curl $1 | grep -Eo "watch\?v=[^[:space:]\"\'\\]{11}" | uniq



