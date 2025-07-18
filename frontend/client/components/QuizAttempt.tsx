import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2, XCircle } from "lucide-react";

interface QuizAttemptProps {
  quiz?: {
    _id: string;
    title: string;
    description: string;
    questions: {
      question_text: string;
      options: string[];
      correct_answer: number;
    }[];
  };
  lessonId: string;
}

export default function QuizAttempt({ quiz, lessonId }: QuizAttemptProps) {
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // ⏳ Initialize answer array when quiz loads
  useEffect(() => {
    if (quiz?.questions?.length) {
      setAnswers(Array(quiz.questions.length).fill(-1));
    }
  }, [quiz]);

  // ✅ Update selected answer for a question
  const handleSelect = (qIndex: number, optionIndex: number) => {
    const updated = [...answers];
    updated[qIndex] = optionIndex;
    setAnswers(updated);
  };

  // 🎯 Evaluate score on submission
  const handleSubmit = () => {
    if (!quiz?.questions) return;
    let correct = 0;
    quiz.questions.forEach((q, i) => {
      if (answers[i] === q.correct_answer) correct++;
    });
    setScore(correct);
    setSubmitted(true);
  };

  // ❗ Guard: Quiz not found or invalid
  if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    return (
      <div className="text-red-600 bg-red-100 border border-red-300 p-4 rounded mt-6">
        ⚠️ Quiz data is not available or invalid.
      </div>
    );
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="text-xl text-purple-700">{quiz.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{quiz.description}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        {quiz.questions.map((q, i) => (
          <div key={i} className="space-y-2">
            <p className="font-medium">
              {i + 1}. {q.question_text}
            </p>
            <RadioGroup
              value={answers[i]?.toString()}
              onValueChange={(val) => handleSelect(i, parseInt(val))}
              disabled={submitted}
            >
              {q.options.map((opt, j) => (
                <div key={j} className="flex items-center space-x-2">
                  <RadioGroupItem value={j.toString()} id={`q${i}_opt${j}`} />
                  <label htmlFor={`q${i}_opt${j}`}>
                    {opt}
                    {submitted && j === q.correct_answer && (
                      <CheckCircle2 className="inline text-green-600 ml-2" size={18} />
                    )}
                    {submitted &&
                      j === answers[i] &&
                      j !== q.correct_answer && (
                        <XCircle className="inline text-red-600 ml-2" size={18} />
                      )}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}

        {!submitted ? (
          <Button onClick={handleSubmit}>Submit Quiz</Button>
        ) : (
          <p className="text-green-700 font-semibold">
            ✅ You scored {score} out of {quiz.questions.length}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
