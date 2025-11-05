import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Testimonial } from "@/hooks/use-reviews";

export const TestimonialCard = ({
  testimonial,
}: {
  testimonial: Testimonial;
}) => {
  return (
    <Card className="group relative max-w-sm overflow-hidden border-gray-200 bg-white shadow transition-all duration-300 hover:-translate-y-1">
      {/* Colored top accent */}
      <div className="bg-primary absolute left-0 right-0 top-0 h-1" />

      {/* Subtle gradient background */}
      <div className="from-primary/5 to-background absolute inset-0 bg-gradient-to-br opacity-50" />

      <CardContent className="relative flex min-h-[200px] flex-col justify-between p-4">
        <div className="space-y-3">
          {/* Quote section with styled background */}
          <div className="relative">
            <div className="bg-primary/10 absolute -left-2 -top-2 h-10 w-10 rounded-full blur-xl" />
            <p className="text-primary relative text-3xl font-serif leading-none">&ldquo;</p>
            <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-gray-700">
              {testimonial.content}
            </p>
          </div>

          {/* Divider */}
          <div className="bg-primary/10 h-px w-full" />
        </div>

        {/* Author section */}
        <div className="flex items-center gap-2">
          <Avatar className="ring-primary/20 size-9 ring-2 ring-offset-1">
            <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {testimonial.name
                .split(" ", 2)
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{testimonial.name}</h4>
            <p className="text-xs text-gray-500">{testimonial.role}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
