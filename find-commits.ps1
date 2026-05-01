#!/bin/bash
# 查找所有 git 对象并尝试找出所有 commit
cd c:/Users/0/Desktop/奥德赛3
echo "=== 检查所有 git 对象 ==="

# 遍历所有对象
for dir in .git/objects/??/; do
    for obj in "$dir"*; do
        if [ -f "$obj" ]; then
            obj_path=$(echo "$obj" | sed -e 's/\.git\/objects\///' -e 's/\///')
            obj_id=$(echo "$obj_path" | tr -d '\r\n')
            
            # 尝试获取对象类型
            type=$(git cat-file -t "$obj_id" 2>/dev/null || continue)
            
            if [ "$type" = "commit" ]; then
                echo "=== Found commit: $obj_id ==="
                git cat-file -p "$obj_id"
                echo "---"
            fi
        fi
    done
done
