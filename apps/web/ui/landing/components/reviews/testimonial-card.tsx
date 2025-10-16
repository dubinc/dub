import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Testimonial } from '@/hooks/use-reviews';

export const TestimonialCard = ({ testimonial }: { testimonial: Testimonial }) => {
  return (
    <Card className='max-w-sm border-none bg-gray-100 shadow-sm'>
      <CardContent className='space-y-8'>
        <div>
          <p className='text-primary text-6xl'>&ldquo;</p>
          <p className='text-neutral-200 -mt-4 line-clamp-3 font-medium'>{testimonial.content}</p>
        </div>
        <div className='flex items-center gap-2'>
          <Avatar className='size-10'>
            <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
            <AvatarFallback>
              {testimonial.name
                .split(' ', 2)
                .map(n => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h4 className='font-medium text-neutral'>{testimonial.name}</h4>
            <p className='text-neutral-200 text-sm'>{testimonial.role}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
