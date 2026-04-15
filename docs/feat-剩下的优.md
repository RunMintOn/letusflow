实际实现情况
type 预设对比
type=	文档提案	代码实现
start	✅ 要绿色圆角	✅ 绿色圆角
end	❌ 文档无	✅ 红色圆角
decision	✅ 菱形	✅ 菱形
input	❌ 文档无	✅ 蓝色倾斜
default	✅ 默认灰	✅ 默认灰
error	✅ 红色	❌ 没实现
warning	✅ 黄色	❌ 没实现
info	✅ 蓝色	❌ 没实现
action	✅ 紫色	❌ 没实现
边样式对比
- dashed / dotted / dashdot ✅ 都已实现
所以还有遗漏
1. type 预设 - 文档提案中的 error / warning / info / action 这 4 个没实现
2. 注释 - ✅ 已实现
3. 行尾注释 - ⚠️ 文档建议不做
4. edge 语法顺序 - ⚠️ 只支持一种写法