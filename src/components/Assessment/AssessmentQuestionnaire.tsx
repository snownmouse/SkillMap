import { useState, useEffect } from 'react';

interface Question {
  id: string;
  question: string;
  dimension: string;
  dimensionName: string;
  type: 'open' | 'scale' | 'multiple';
  options?: string[];
}

interface Answer {
  questionId: string;
  answer: string | number;
}

export function AssessmentQuestionnaire() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await fetch('/api/assessment/questions', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setQuestions(data.data.questions);
        }
      }
    } catch (error) {
      console.error('获取评估问题失败:', error);
    }
  };

  const handleAnswer = (questionId: string, answer: string | number) => {
    setAnswers(prev => {
      const existing = prev.find(a => a.questionId === questionId);
      if (existing) {
        return prev.map(a => a.questionId === questionId ? { ...a, answer } : a);
      }
      return [...prev, { questionId, answer }];
    });
  };

  const handleSubmit = async () => {
    if (answers.length === 0) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/assessment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answers }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setResult(data.data);
          setShowResult(true);
        }
      }
    } catch (error) {
      console.error('提交评估失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = () => {
    setAnswers([]);
    setCurrentStep(0);
    setShowResult(false);
    setResult(null);
  };

  if (showResult && result) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">评估结果</h2>
          
          {result.insights && result.insights.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              {result.insights.map((insight: string, index: number) => (
                <p key={index} className="text-blue-700">{insight}</p>
              ))}
            </div>
          )}
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">维度评估</h3>
            <div className="space-y-4">
              {result.dimensionInterpretations?.map((dim: any) => (
                <div key={dim.dimensionId} className="flex items-center gap-4">
                  <span className="w-24 text-sm text-gray-600">{dim.dimensionName}</span>
                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        dim.score >= 80 ? 'bg-green-500' : dim.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${dim.score}%` }}
                    />
                  </div>
                  <span className="w-12 text-sm font-medium text-gray-700">{dim.score}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">路径推荐</h3>
            <div className="space-y-3">
              {result.pathRecommendations?.slice(0, 3).map((path: any, index: number) => (
                <div 
                  key={path.pathId}
                  className={`p-4 rounded-lg ${index === 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium text-gray-800">{path.pathName}</span>
                      <p className="text-sm text-gray-500">{path.nationalAlignment}</p>
                    </div>
                    <span className={`text-xl font-bold ${
                      path.fitScore >= 80 ? 'text-green-500' : path.fitScore >= 60 ? 'text-yellow-500' : 'text-red-500'
                    }`}>
                      {path.fitScore}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <button
            onClick={handleRestart}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重新评估
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">加载评估问题中...</p>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentStep];
  const currentAnswer = answers.find(a => a.questionId === currentQuestion?.id);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">职业价值观评估</h2>
          <span className="text-sm text-gray-500">
            {currentStep + 1} / {questions.length}
          </span>
        </div>
        
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {currentQuestion && (
          <div className="mb-6">
            <div className="mb-4 px-3 py-2 bg-blue-50 rounded-lg inline-block">
              <span className="text-sm text-blue-600">{currentQuestion.dimensionName}</span>
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-6">
              {currentQuestion.question}
            </h3>

            {currentQuestion.type === 'scale' && (
              <div className="space-y-4">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>非常不符合</span>
                  <span>非常符合</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <button
                      key={num}
                      onClick={() => handleAnswer(currentQuestion.id, num * 10)}
                      className={`flex-1 py-3 rounded-lg border-2 transition-all ${
                        currentAnswer?.answer === num * 10
                          ? 'border-blue-500 bg-blue-50 text-blue-600'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentQuestion.type === 'multiple' && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(currentQuestion.id, option)}
                    className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                      currentAnswer?.answer === option
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.type === 'open' && (
              <textarea
                value={(currentAnswer?.answer as string) || ''}
                onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                placeholder="请输入你的回答..."
                className="w-full h-32 p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
              />
            )}
          </div>
        )}

        <div className="flex gap-4">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              上一题
            </button>
          )}
          
          {currentStep < questions.length - 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              下一题
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '提交中...' : '提交评估'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}