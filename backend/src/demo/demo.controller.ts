import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { DemoService } from './demo.service';

// All routes are PUBLIC (the marketing website calls them) but gated by
// OTP verification + a 24h token + rate limits inside the service.
@Controller('demo')
export class DemoController {
  constructor(private demoService: DemoService) {}

  @Post('send-otp')
  sendOtp(@Body() body: any) {
    return this.demoService.sendOtp(body);
  }

  @Post('verify-otp')
  verifyOtp(@Body() body: any) {
    return this.demoService.verifyOtp(body);
  }

  @Get('session')
  session(@Query('token') token: string) {
    return this.demoService.session(token);
  }

  @Post('call')
  call(@Body() body: any) {
    return this.demoService.call(body);
  }
}
