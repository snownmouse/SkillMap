import React, { useEffect, useState } from 'react';
import { useSkillTree } from '../hooks/useSkillTree';
import AppLayout from '../components/Layout/AppLayout';

const TestPage: React.FC = () => {
  const { loadTrees, trees, isLoading, error } = useSkillTree();
  const [testMessage, setTestMessage] = useState<string>('');
  const [apiResponse, setApiResponse] = useState<any>(null);

  useEffect(() => {
    // 测试API调用
    const testApi = async () => {
      setTestMessage('开始测试API调用...');
      try {
        // 直接调用apiClient.listTrees()，查看返回数据
        const response = await import('../services/apiClient').then(m => m.apiClient.listTrees());
        console.log('apiClient.listTrees() response:', response);
        setApiResponse(response);
        setTestMessage('API调用成功！返回了 ' + response.trees.length + ' 个技能树');
        // 调用loadTrees函数
        await loadTrees();
      } catch (err) {
        console.error('API调用失败:', err);
        setTestMessage('API调用失败: ' + (err as Error).message);
      }
    };

    testApi();
  }, [loadTrees]);

  return (
    <AppLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">API测试页面</h1>
        <p className="mb-4">{testMessage}</p>
        <p className="mb-4">加载状态: {isLoading ? '加载中' : '加载完成'}</p>
        <p className="mb-4">错误信息: {error || '无'}</p>
        <p className="mb-4">技能树数量: {trees.length}</p>
        {apiResponse && (
          <div className="mb-4">
            <h2 className="text-xl font-bold mb-2">API响应数据:</h2>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </div>
        )}
        <div className="mt-4">
          <h2 className="text-xl font-bold mb-2">技能树列表:</h2>
          <ul className="list-disc pl-6">
            {trees.map(tree => (
              <li key={tree.id}>{tree.career} - {tree.created_at}</li>
            ))}
          </ul>
        </div>
      </div>
    </AppLayout>
  );
};

export default TestPage;
